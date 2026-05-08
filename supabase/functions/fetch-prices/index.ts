import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { normalizePriceCurrency, parseSymbol } from "../_shared/price-providers/stockanalysis.ts";
import { fetchCryptoPricesFlow, type CryptoPriceItem } from "./crypto_flow.ts";
import { fetchPriceablePricesFlow, type PriceablePriceItem } from "./priceable_flow.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TTL_MS = 3 * 60 * 60 * 1000;
const PRICEABLE_TYPES = ["stock", "etf", "bond", "mutual_fund", "commodity"];

interface RequestItem {
  symbol: string;
  asset_type: string;
}

interface CacheRow {
  cache_key: string;
  response: { price: number; currency?: string };
  expires_at: string | null;
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
      return json({ prices: {} });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const prices: Record<string, number | null> = {};
    const currencies: Record<string, string> = {};
    const now = Date.now();

    const cacheKeys = items.map((i) => `price:${i.symbol.toUpperCase()}`);
    const { data: cached } = await supabase
      .from("api_cache")
      .select("cache_key, response, expires_at")
      .in("cache_key", cacheKeys) as { data: CacheRow[] | null };

    const cacheMap = new Map<string, { price: number; currency?: string }>();
    for (const row of cached ?? []) {
      if (row.expires_at != null && new Date(row.expires_at).getTime() > now) {
        cacheMap.set(row.cache_key, row.response);
      }
    }

    const needCrypto: CryptoPriceItem[] = [];
    const needPriceable: PriceablePriceItem[] = [];

    for (const item of items) {
      const sym = item.symbol.toUpperCase();
      const cacheKey = `price:${sym}`;
      const cachedItem = cacheMap.get(cacheKey);
      if (cachedItem) {
        if (cachedItem.currency) {
          const normed = normalizePriceCurrency(cachedItem.price, cachedItem.currency);
          prices[sym] = normed.price;
          currencies[sym] = normed.currency;
        } else {
          prices[sym] = cachedItem.price;
        }
        continue;
      }

      const { exchange, ticker } = parseSymbol(sym);
      if (item.asset_type === "crypto") {
        needCrypto.push({ symbol: sym, yahooSymbol: `${ticker}-USD` });
      } else if (PRICEABLE_TYPES.includes(item.asset_type)) {
        needPriceable.push({ symbol: sym, asset_type: item.asset_type, exchange, ticker });
      }
    }

    const priceableResult = await fetchPriceablePricesFlow(needPriceable, Deno.env.get("FINNHUB_API_KEY") ?? undefined);
    for (const [symbol, price] of Object.entries(priceableResult.prices)) {
      prices[symbol] = price;
      const currency = priceableResult.currencies[symbol];
      if (currency) currencies[symbol] = currency;
      const response: { price: number; currency?: string } = { price };
      if (currency) response.currency = currency;
      await upsertPriceCache(supabase, symbol, response, now);
    }

    const cryptoPrices = await fetchCryptoPricesFlow(needCrypto);
    for (const [symbol, price] of Object.entries(cryptoPrices)) {
      prices[symbol] = price;
      await upsertPriceCache(supabase, symbol, { price }, now);
    }

    return json({ prices, currencies });
  } catch (err) {
    console.error("fetch-prices error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

async function upsertPriceCache(
  supabase: ReturnType<typeof createClient>,
  symbol: string,
  response: { price: number; currency?: string },
  now: number,
) {
  await supabase.from("api_cache").upsert(
    {
      cache_key: `price:${symbol}`,
      response,
      updated_at: new Date().toISOString(),
      expires_at: new Date(now + TTL_MS).toISOString(),
    },
    { onConflict: "cache_key" },
  );
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
