import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CRYPTO_TTL_SECONDS = 60;
const STOCK_TTL_SECONDS = 60;
const FX_TTL_SECONDS = 3600;

interface RequestItem {
  symbol: string;
  asset_type: string;
}

interface CacheRow {
  cache_key: string;
  response: { price: number };
  updated_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
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

    // Load all cached prices for requested symbols
    const cacheKeys = items.map((i) => `price:${i.symbol.toUpperCase()}`);
    const { data: cached } = await supabase
      .from("api_cache")
      .select("cache_key, response, updated_at")
      .in("cache_key", cacheKeys) as { data: CacheRow[] | null };

    const cacheMap = new Map<string, { price: number; updated_at: string }>();
    for (const row of cached ?? []) {
      cacheMap.set(row.cache_key, {
        price: row.response.price,
        updated_at: row.updated_at,
      });
    }

    // Determine what needs a fresh fetch
    const needCgIds: string[] = [];
    const cgIdToSymbol: Record<string, string> = {};
    const needStocks: string[] = [];

    for (const item of items) {
      const sym = item.symbol.toUpperCase();
      const cacheKey = `price:${sym}`;
      const entry = cacheMap.get(cacheKey);
      const isCrypto = item.asset_type === "crypto";
      const ttl = isCrypto ? CRYPTO_TTL_SECONDS : STOCK_TTL_SECONDS;

      if (entry && (now - new Date(entry.updated_at).getTime()) / 1000 < ttl) {
        prices[sym] = entry.price;
      } else if (isCrypto) {
        const cgId = symbolToCoinGeckoId(sym);
        needCgIds.push(cgId);
        cgIdToSymbol[cgId] = sym;
      } else if (
        ["stock", "etf", "bond", "mutual_fund", "commodity"].includes(item.asset_type)
      ) {
        needStocks.push(sym);
      }
    }

    // Fetch crypto prices from CoinGecko (free tier, no key needed)
    if (needCgIds.length > 0) {
      try {
        const url =
          `https://api.coingecko.com/api/v3/simple/price?ids=${needCgIds.join(",")}&vs_currencies=usd`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          const data = await res.json() as Record<string, { usd: number }>;
          const upserts = [];

          for (const [cgId, quote] of Object.entries(data)) {
            const sym = cgIdToSymbol[cgId];
            if (sym && quote.usd) {
              prices[sym] = quote.usd;
              upserts.push({
                cache_key: `price:${sym}`,
                response: { price: quote.usd },
                updated_at: new Date().toISOString(),
              });
            }
          }

          if (upserts.length > 0) {
            await supabase
              .from("api_cache")
              .upsert(upserts, { onConflict: "cache_key" });
          }
        }
      } catch (e) {
        console.error("CoinGecko error:", e);
      }
    }

    // Fetch stock/ETF prices from Finnhub
    const finnhubToken = Deno.env.get("FINNHUB_API_KEY");
    if (needStocks.length > 0 && finnhubToken) {
      await Promise.all(
        needStocks.map(async (sym) => {
          try {
            const url =
              `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubToken}`;
            const res = await fetch(url);

            if (res.ok) {
              const data = await res.json() as { c: number };
              if (data.c > 0) {
                prices[sym] = data.c;
                await supabase.from("api_cache").upsert(
                  {
                    cache_key: `price:${sym}`,
                    response: { price: data.c },
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "cache_key" },
                );
              }
            }
          } catch (e) {
            console.error(`Finnhub error for ${sym}:`, e);
          }
        }),
      );
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
