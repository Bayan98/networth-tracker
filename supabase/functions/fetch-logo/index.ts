import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { coinGeckoIdForSymbol, fetchCoinGeckoLogoUrl } from "../_shared/price-providers/coingecko/index.ts";
import { fetchYahooLogoUrl } from "../_shared/price-providers/yahoo/index.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOGO_TTL_MS = 4 * 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { symbol, asset_type } = await req.json() as { symbol: string; asset_type: string };
    const sym = symbol.toUpperCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cacheKey = `logo:${sym}`;
    const { data: cached } = await supabase
      .from("api_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cached?.expires_at && new Date(cached.expires_at).getTime() > Date.now()) {
      return json(cached.response as { logoUrl: string | null });
    }

    let logoUrl: string | null = null;

    if (asset_type === "crypto") {
      logoUrl = await fetchCoinGeckoLogoUrl(coinGeckoIdForSymbol(sym));
    } else {
      logoUrl = await fetchYahooLogoUrl(sym);
    }

    const result = { logoUrl };
    await supabase.from("api_cache").upsert(
      { cache_key: cacheKey, response: result, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + LOGO_TTL_MS).toISOString() },
      { onConflict: "cache_key" },
    );

    return json(result);
  } catch (err) {
    console.error("fetch-logo error:", err);
    return json({ logoUrl: null });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
