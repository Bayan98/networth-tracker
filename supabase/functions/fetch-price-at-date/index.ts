import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchCryptoPriceAtDateFlow } from "./crypto_flow.ts";
import { fetchPriceablePriceAtDateFlow } from "./priceable_flow.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICEABLE_TYPES = ["stock", "etf", "bond", "mutual_fund", "commodity"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { symbol, asset_type, date } = await req.json() as { symbol: string; asset_type: string; date: string };
    const sym = symbol.toUpperCase().trim();
    const today = new Date().toISOString().slice(0, 10);
    const isToday = date === today;
    const ttlMs = isToday ? 3 * 60 * 60 * 1000 : 4 * 7 * 24 * 60 * 60 * 1000;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cacheKey = `price-at-date:${sym}:${date}`;
    const { data: cached } = await supabase
      .from("api_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cached?.expires_at && new Date(cached.expires_at).getTime() > Date.now()) {
      return json(cached.response as { price: number | null });
    }

    const dateEpoch = new Date(date + "T12:00:00Z").getTime() / 1000;
    const period1 = Math.floor(dateEpoch) - 86400;
    const period2 = Math.floor(dateEpoch) + 86400;
    let price: number | null = null;

    if (asset_type === "crypto") {
      price = await fetchCryptoPriceAtDateFlow(sym, date, dateEpoch, period1, period2, isToday);
    } else if (PRICEABLE_TYPES.includes(asset_type)) {
      price = await fetchPriceablePriceAtDateFlow(sym, asset_type, dateEpoch, period1, period2, isToday);
    }

    const result = { price };
    await supabase.from("api_cache").upsert(
      {
        cache_key: cacheKey,
        response: result,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttlMs).toISOString(),
      },
      { onConflict: "cache_key" },
    );

    return json(result);
  } catch (err) {
    console.error("fetch-price-at-date error:", err);
    return json({ price: null });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
