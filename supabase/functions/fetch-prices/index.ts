import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TTL_MS = 3 * 60 * 60 * 1000;

interface RequestItem {
  symbol: string;
  asset_type: string;
}

interface CacheRow {
  cache_key: string;
  response: { price: number };
  expires_at: string | null;
}

async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!res.ok) return {};
    const data = await res.json() as {
      quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice?: number }> };
    };
    const result: Record<string, number> = {};
    for (const q of data?.quoteResponse?.result ?? []) {
      if (q.regularMarketPrice != null && q.regularMarketPrice > 0) {
        result[q.symbol] = q.regularMarketPrice;
      }
    }
    return result;
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json() as { items: RequestItem[] };
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ prices: {} }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const prices: Record<string, number | null> = {};
    const now = Date.now();

    const cacheKeys = items.map((i) => `price:${i.symbol.toUpperCase()}`);
    const { data: cached } = await supabase
      .from("api_cache")
      .select("cache_key, response, expires_at")
      .in("cache_key", cacheKeys) as { data: CacheRow[] | null };

    const cacheMap = new Map<string, number>();
    for (const row of cached ?? []) {
      if (row.expires_at != null && new Date(row.expires_at).getTime() > now) {
        cacheMap.set(row.cache_key, row.response.price);
      }
    }

    const needStockSyms: string[] = [];
    const needCryptoSyms: string[] = [];
    const cryptoOrigMap: Record<string, string> = {};

    for (const item of items) {
      const sym = item.symbol.toUpperCase();
      const cacheKey = `price:${sym}`;
      if (cacheMap.has(cacheKey)) {
        prices[sym] = cacheMap.get(cacheKey)!;
      } else if (item.asset_type === "crypto") {
        const yahooSym = `${sym}-USD`;
        needCryptoSyms.push(yahooSym);
        cryptoOrigMap[yahooSym] = sym;
      } else if (["stock", "etf", "bond", "mutual_fund", "commodity"].includes(item.asset_type)) {
        needStockSyms.push(sym);
      }
    }

    // Primary: Yahoo Finance batch for stocks
    if (needStockSyms.length > 0) {
      const yahooResult = await fetchYahooQuotes(needStockSyms);
      const upserts = [];
      for (const [sym, price] of Object.entries(yahooResult)) {
        prices[sym] = price;
        upserts.push({
          cache_key: `price:${sym}`,
          response: { price },
          updated_at: new Date().toISOString(),
          expires_at: new Date(now + TTL_MS).toISOString(),
        });
      }
      if (upserts.length > 0) {
        await supabase.from("api_cache").upsert(upserts, { onConflict: "cache_key" });
      }
    }

    // Primary: Yahoo Finance batch for crypto ({SYM}-USD)
    if (needCryptoSyms.length > 0) {
      const yahooResult = await fetchYahooQuotes(needCryptoSyms);
      const upserts = [];
      for (const [yahooSym, price] of Object.entries(yahooResult)) {
        const origSym = cryptoOrigMap[yahooSym];
        if (origSym) {
          prices[origSym] = price;
          upserts.push({
            cache_key: `price:${origSym}`,
            response: { price },
            updated_at: new Date().toISOString(),
            expires_at: new Date(now + TTL_MS).toISOString(),
          });
        }
      }
      if (upserts.length > 0) {
        await supabase.from("api_cache").upsert(upserts, { onConflict: "cache_key" });
      }
    }

    // Fallback: Finnhub for stocks Yahoo missed
    const finnhubToken = Deno.env.get("FINNHUB_API_KEY");
    const stocksFailed = needStockSyms.filter((sym) => prices[sym] == null);
    if (stocksFailed.length > 0 && finnhubToken) {
      await Promise.all(stocksFailed.map(async (sym) => {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubToken}`);
          if (res.ok) {
            const data = await res.json() as { c?: number };
            if (data.c && data.c > 0) {
              prices[sym] = data.c;
              await supabase.from("api_cache").upsert(
                { cache_key: `price:${sym}`, response: { price: data.c }, updated_at: new Date().toISOString(), expires_at: new Date(now + TTL_MS).toISOString() },
                { onConflict: "cache_key" },
              );
            }
          }
        } catch (e) {
          console.error(`Finnhub fallback for ${sym}:`, e);
        }
      }));
    }

    // Fallback: CoinGecko for crypto Yahoo missed
    const cryptoFailed = needCryptoSyms
      .filter((ySym) => prices[cryptoOrigMap[ySym]] == null)
      .map((ySym) => cryptoOrigMap[ySym]);

    if (cryptoFailed.length > 0) {
      const cgIds = cryptoFailed.map(symbolToCoinGeckoId);
      const cgIdToSym: Record<string, string> = {};
      cryptoFailed.forEach((sym, i) => { cgIdToSym[cgIds[i]] = sym; });

      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds.join(",")}&vs_currencies=usd`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json() as Record<string, { usd: number }>;
          const upserts = [];
          for (const [cgId, quote] of Object.entries(data)) {
            const sym = cgIdToSym[cgId];
            if (sym && quote.usd) {
              prices[sym] = quote.usd;
              upserts.push({
                cache_key: `price:${sym}`,
                response: { price: quote.usd },
                updated_at: new Date().toISOString(),
                expires_at: new Date(now + TTL_MS).toISOString(),
              });
            }
          }
          if (upserts.length > 0) {
            await supabase.from("api_cache").upsert(upserts, { onConflict: "cache_key" });
          }
        }
      } catch (e) {
        console.error("CoinGecko fallback:", e);
      }
    }

    return new Response(JSON.stringify({ prices }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-prices error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
