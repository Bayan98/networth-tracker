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

export interface LookupResult {
  name: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
  logoUrl: string | null;
}

export interface LookupSymbolRequest {
  symbol: string;
  asset_type: string;
}

export interface LookupCacheRow {
  cache_key: string;
  response: LookupResult;
  expires_at: string | null;
}

export interface LookupCacheUpsert {
  cache_key: string;
  response: LookupResult;
  updated_at: string;
  expires_at: string;
}

export interface LookupCache {
  getMany: (cacheKeys: string[]) => Promise<LookupCacheRow[]>;
  upsert: (row: LookupCacheUpsert) => Promise<void>;
}

export interface CoinGeckoCoin {
  name?: string;
  market_data?: { current_price?: { usd?: number } };
  image?: { small?: string };
  description?: { en?: string };
}

export interface LookupProviders {
  fetchYahooSummary?: (yahooSym: string) => Promise<Partial<LookupResult>>;
  fetchCoinGeckoCoin?: (coinGeckoId: string) => Promise<CoinGeckoCoin | null>;
  searchCoinGeckoName?: (ticker: string) => Promise<string | null>;
  fetchStockAnalysisQuote?: typeof fetchStockAnalysisQuote;
  findYahooSymbol?: (ticker: string) => Promise<string | null>;
  finnhubToken?: string;
}

export interface LookupDeps {
  cache: LookupCache;
  providers?: LookupProviders;
  now?: () => number;
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
    } else {
      await res.body?.cancel();
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
      } else {
        await res.body?.cancel();
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
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
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

export async function fetchCoinGeckoCoin(coinGeckoId: string): Promise<CoinGeckoCoin | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    return await res.json() as CoinGeckoCoin;
  } catch (_) {
    return null;
  }
}

async function searchCoinGeckoName(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${ticker}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = await res.json() as { coins?: Array<{ name: string; symbol: string }> };
    const match = data.coins?.find((c) => c.symbol.toUpperCase() === ticker);
    return match?.name ?? null;
  } catch (_) {
    return null;
  }
}

export async function handleLookupSymbol(
  payload: LookupSymbolRequest,
  deps: LookupDeps,
): Promise<LookupResult> {
  const sym = payload.symbol.toUpperCase().trim();
  const assetType = payload.asset_type;
  if (!sym || !assetType || !PRICEABLE.includes(assetType)) {
    return { name: null, price: null, currency: null, description: null, logoUrl: null };
  }

  const now = deps.now?.() ?? Date.now();
  const cacheKey = `lookup:${sym}`;
  const cached = await deps.cache.getMany([cacheKey]);
  const cachedRow = cached[0];

  if (cachedRow?.expires_at && new Date(cachedRow.expires_at).getTime() > now) {
    return cachedRow.response;
  }

  const providers = deps.providers ?? {};
  const yahooSummary = providers.fetchYahooSummary ?? fetchYahooSummary;
  const coinGeckoCoin = providers.fetchCoinGeckoCoin ?? fetchCoinGeckoCoin;
  const coinGeckoName = providers.searchCoinGeckoName ?? searchCoinGeckoName;
  const stockAnalysisQuote = providers.fetchStockAnalysisQuote ?? fetchStockAnalysisQuote;
  const yahooSymbolFinder = providers.findYahooSymbol ?? findYahooSymbol;

  let result: LookupResult = { name: null, price: null, currency: null, description: null, logoUrl: null };
  const { exchange, ticker } = parseSymbol(sym);

  if (assetType === "crypto") {
    const yahooResult = await yahooSummary(`${ticker}-USD`);
    if (yahooResult.name || yahooResult.price != null) {
      result = { ...result, ...yahooResult };
      if (!result.currency) result.currency = "USD";
    }

    if (!result.name || result.price == null) {
      const data = await coinGeckoCoin(symbolToCoinGeckoId(ticker));
      if (data) {
        if (!result.name && data.name) result.name = data.name;
        if (result.price == null) result.price = data.market_data?.current_price?.usd ?? null;
        if (!result.logoUrl && data.image?.small) result.logoUrl = data.image.small;
        if (!result.description && data.description?.en) {
          result.description = data.description.en.replace(/<[^>]*>/g, "").slice(0, 500) || null;
        }
        if (!result.currency) result.currency = "USD";
      }

      if (!result.name) {
        result.name = await coinGeckoName(ticker);
      }
    }
  } else {
    const [saResult, yahooResult] = await Promise.all([
      stockAnalysisQuote(sym, assetType),
      yahooSummary(exchange ? ticker : sym),
    ]);

    if (saResult.name) result.name = saResult.name;
    if (saResult.price != null) result.price = saResult.price;
    if (saResult.currency) result.currency = saResult.currency;
    if (saResult.description) result.description = saResult.description;

    if (!result.name && yahooResult.name) result.name = yahooResult.name;
    if (result.price == null && yahooResult.price != null) result.price = yahooResult.price;
    if (!result.currency && yahooResult.currency) result.currency = yahooResult.currency;
    if (!result.description && yahooResult.description) result.description = yahooResult.description;
    if (!result.logoUrl && yahooResult.logoUrl) result.logoUrl = yahooResult.logoUrl;

    if (result.price == null && exchange) {
      const altSym = await yahooSymbolFinder(ticker);
      if (altSym && altSym !== ticker) {
        const altYahoo = await yahooSummary(altSym);
        if (altYahoo.price != null) result.price = altYahoo.price;
        if (!result.name && altYahoo.name) result.name = altYahoo.name;
        if (!result.currency && altYahoo.currency) result.currency = altYahoo.currency;
        if (!result.logoUrl && altYahoo.logoUrl) result.logoUrl = altYahoo.logoUrl;
      }
    }

    if (result.price == null && !exchange) {
      const token = providers.finnhubToken ?? Deno.env.get("FINNHUB_API_KEY");
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

  await deps.cache.upsert({
    cache_key: cacheKey,
    response: result,
    updated_at: new Date(now).toISOString(),
    expires_at: new Date(now + TTL_MS).toISOString(),
  });

  return result;
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      return json(await handleLookupSymbol(await req.json() as LookupSymbolRequest, {
        cache: createSupabaseCache(supabase),
      }));
    } catch (err) {
      console.error("lookup-symbol error:", err);
      return json({ name: null, price: null, currency: null, description: null, logoUrl: null });
    }
  });
}

// deno-lint-ignore no-explicit-any
function createSupabaseCache(supabase: any): LookupCache {
  return {
    async getMany(cacheKeys) {
      const { data, error } = await supabase
        .from("api_cache")
        .select("cache_key, response, expires_at")
        .in("cache_key", cacheKeys);
      if (error) throw error;
      return (data ?? []) as LookupCacheRow[];
    },
    async upsert(row) {
      const { error } = await supabase.from("api_cache").upsert(row, { onConflict: "cache_key" });
      if (error) throw error;
    },
  };
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
