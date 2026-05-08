import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";
import { fetchStockAnalysisQuote, parseSymbol } from "../_shared/price-providers/stockanalysis.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICEABLE = ["stock", "etf", "bond", "mutual_fund", "commodity", "crypto"];
const TTL_MS = 60 * 60 * 1000;

interface LookupResult {
  name: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
  logoUrl: string | null;
}

async function fetchYahooSummary(yahooSym: string): Promise<Partial<LookupResult>> {
  const result: Partial<LookupResult> = {};

  try {
    const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${yahooSym}?modules=price%2CassetProfile`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (res.ok) {
      const data = await res.json() as {
        quoteSummary?: {
          result?: Array<{
            price?: { shortName?: string; longName?: string; currency?: string; regularMarketPrice?: { raw?: number } };
            assetProfile?: { longBusinessSummary?: string; website?: string };
          }> | null;
          error?: unknown;
        };
      };
      if (data?.quoteSummary?.error) return result;
      const r = data?.quoteSummary?.result?.[0];
      if (r?.price) {
        result.name = r.price.longName ?? r.price.shortName ?? null;
        result.currency = r.price.currency ?? null;
        const rawPrice = r.price.regularMarketPrice?.raw;
        if (rawPrice != null && rawPrice > 0) result.price = rawPrice;
      }
      if (r?.assetProfile?.longBusinessSummary) {
        result.description = r.assetProfile.longBusinessSummary.slice(0, 500);
      }
      if (r?.assetProfile?.website) {
        try {
          const domain = new URL(r.assetProfile.website).hostname.replace(/^www\./, "");
          result.logoUrl = `https://logo.clearbit.com/${domain}`;
        } catch (_) { /* ignore */ }
      }
    }
  } catch (_) { /* ignore */ }

  // Search API for logoUrl fallback
  if (!result.logoUrl) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${yahooSym}&quotesCount=1&newsCount=0`,
        { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } },
      );
      if (res.ok) {
        const data = await res.json() as { quotes?: Array<{ logoUrl?: string }> };
        const logoUrl = data?.quotes?.[0]?.logoUrl;
        if (logoUrl) result.logoUrl = logoUrl;
      }
    } catch (_) { /* ignore */ }
  }

  return result;
}

/** Try to find a Yahoo Finance symbol for an international stock */
async function findYahooSymbol(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=5&newsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      quotes?: Array<{ symbol?: string; typeDisp?: string; quoteType?: string }>;
    };
    // Prefer equity/ETF types that contain the ticker
    const candidates = (data?.quotes ?? [])
      .filter((q) => q.symbol && !["FUTURE", "CURRENCY", "OPTION", "INDEX"].includes(q.quoteType ?? ""))
      .filter((q) => q.symbol!.toUpperCase().startsWith(ticker.toUpperCase()));
    return candidates[0]?.symbol ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { symbol, asset_type } = await req.json() as { symbol: string; asset_type: string };
    const sym = symbol.toUpperCase().trim();
    if (!sym || !asset_type || !PRICEABLE.includes(asset_type)) {
      return json({ name: null, price: null, currency: null, description: null, logoUrl: null });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cacheKey = `lookup:${sym}`;
    const { data: cached } = await supabase
      .from("api_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cached?.expires_at && new Date(cached.expires_at).getTime() > Date.now()) {
      return json(cached.response as LookupResult);
    }

    let result: LookupResult = { name: null, price: null, currency: null, description: null, logoUrl: null };
    const { exchange, ticker } = parseSymbol(sym);

    if (asset_type === "crypto") {
      // Primary: Yahoo Finance {SYM}-USD
      const yahooResult = await fetchYahooSummary(`${ticker}-USD`);
      if (yahooResult.name || yahooResult.price != null) {
        result = { ...result, ...yahooResult };
        if (!result.currency) result.currency = "USD";
      }

      // Fallback: CoinGecko
      if (!result.name || result.price == null) {
        const cgId = symbolToCoinGeckoId(ticker);
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json() as {
              name?: string;
              market_data?: { current_price?: { usd?: number } };
              image?: { small?: string };
              description?: { en?: string };
            };
            if (!result.name && data.name) result.name = data.name;
            if (result.price == null) result.price = data.market_data?.current_price?.usd ?? null;
            if (!result.logoUrl && data.image?.small) result.logoUrl = data.image.small;
            if (!result.description && data.description?.en) {
              result.description = data.description.en.replace(/<[^>]*>/g, "").slice(0, 500) || null;
            }
            if (!result.currency) result.currency = "USD";
          }
        } catch (_) { /* ignore */ }

        if (!result.name) {
          try {
            const res = await fetch(
              `https://api.coingecko.com/api/v3/search?query=${ticker}`,
              { headers: { Accept: "application/json" } },
            );
            if (res.ok) {
              const data = await res.json() as { coins?: Array<{ name: string; symbol: string }> };
              const match = data.coins?.find((c) => c.symbol.toUpperCase() === ticker);
              if (match) result.name = match.name;
            }
          } catch (_) { /* ignore */ }
        }
      }
    } else {
      // Primary: StockAnalysis.com (price + name)
      // Run SA and Yahoo in parallel for speed; SA takes priority for price
      const [saResult, yahooResult] = await Promise.all([
        fetchStockAnalysisQuote(sym, asset_type),
        fetchYahooSummary(exchange ? ticker : sym),
      ]);

      // Merge: SA has priority for price (especially for international stocks)
      if (saResult.name) result.name = saResult.name;
      if (saResult.price != null) result.price = saResult.price;
      if (saResult.currency) result.currency = saResult.currency;
      if (saResult.description) result.description = saResult.description;

      // Yahoo fills in any gaps
      if (!result.name && yahooResult.name) result.name = yahooResult.name;
      if (result.price == null && yahooResult.price != null) result.price = yahooResult.price;
      if (!result.currency && yahooResult.currency) result.currency = yahooResult.currency;
      if (!result.description && yahooResult.description) result.description = yahooResult.description;
      if (!result.logoUrl && yahooResult.logoUrl) result.logoUrl = yahooResult.logoUrl;

      // If SA page worked but no price (client-side rendered price), try Yahoo alternative symbol
      if (result.price == null && exchange) {
        const altSym = await findYahooSymbol(ticker);
        if (altSym && altSym !== ticker) {
          const altYahoo = await fetchYahooSummary(altSym);
          if (altYahoo.price != null) result.price = altYahoo.price;
          if (!result.name && altYahoo.name) result.name = altYahoo.name;
          if (!result.currency && altYahoo.currency) result.currency = altYahoo.currency;
          if (!result.logoUrl && altYahoo.logoUrl) result.logoUrl = altYahoo.logoUrl;
        }
      }

      // Finnhub fallback for plain symbols still missing price
      if (result.price == null && !exchange) {
        const token = Deno.env.get("FINNHUB_API_KEY");
        if (token) {
          await Promise.all([
            fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${token}`)
              .then(async (r) => {
                if (r.ok) {
                  const d = await r.json() as { name?: string };
                  if (!result.name && d.name) result.name = d.name;
                }
              }).catch(() => {}),
            fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${token}`)
              .then(async (r) => {
                if (r.ok) {
                  const d = await r.json() as { c?: number };
                  if (result.price == null && d.c && d.c > 0) result.price = d.c;
                }
              }).catch(() => {}),
          ]);
        }
      }
    }

    await supabase.from("api_cache").upsert(
      { cache_key: cacheKey, response: result, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + TTL_MS).toISOString() },
      { onConflict: "cache_key" },
    );

    return json(result);
  } catch (err) {
    console.error("lookup-symbol error:", err);
    return json({ name: null, price: null, currency: null, description: null, logoUrl: null });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
