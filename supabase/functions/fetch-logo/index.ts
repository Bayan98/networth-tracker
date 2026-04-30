import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";

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
      const cgId = symbolToCoinGeckoId(sym);
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
          { headers: { Accept: "application/json" } },
        );
        if (res.ok) {
          const data = await res.json() as { image?: { small?: string } };
          logoUrl = data.image?.small ?? null;
        }
      } catch (_) { /* ignore */ }
    } else {
      // Yahoo Finance quoteSummary → website → Clearbit
      try {
        const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${sym}?modules=assetProfile`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        });
        if (res.ok) {
          const data = await res.json() as {
            quoteSummary?: { result?: Array<{ assetProfile?: { website?: string } }> | null };
          };
          const website = data.quoteSummary?.result?.[0]?.assetProfile?.website;
          if (website) {
            const domain = new URL(website).hostname.replace(/^www\./, "");
            logoUrl = `https://logo.clearbit.com/${domain}`;
          }
        }
      } catch (_) { /* ignore */ }

      // Yahoo Finance search for logoUrl
      if (!logoUrl) {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${sym}&quotesCount=1&newsCount=0`,
            { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } },
          );
          if (res.ok) {
            const data = await res.json() as { quotes?: Array<{ logoUrl?: string }> };
            logoUrl = data.quotes?.[0]?.logoUrl ?? null;
          }
        } catch (_) { /* ignore */ }
      }
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
