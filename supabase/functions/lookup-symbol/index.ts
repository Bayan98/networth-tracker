import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICEABLE = ["stock", "etf", "bond", "mutual_fund", "commodity", "crypto"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { symbol, asset_type } = await req.json() as {
      symbol: string;
      asset_type: string;
    };

    const sym = symbol.toUpperCase().trim();
    if (!sym || !asset_type) {
      return json({ name: null, price: null });
    }

    if (!PRICEABLE.includes(asset_type)) {
      return json({ name: null, price: null });
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

    if (cached) {
      const notExpired = cached.expires_at != null && new Date(cached.expires_at).getTime() > Date.now();
      if (notExpired) {
        return json(cached.response as { name: string | null; price: number | null });
      }
    }

    let name: string | null = null;
    let price: number | null = null;

    if (asset_type === "crypto") {
      const cgId = symbolToCoinGeckoId(sym);

      // Get name + price in one call
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
          { headers: { Accept: "application/json" } },
        );
        if (res.ok) {
          const data = await res.json() as {
            name: string;
            market_data: { current_price: { usd: number } };
          };
          name = data.name ?? null;
          price = data.market_data?.current_price?.usd ?? null;
        }
      } catch (_) { /* ignore */ }

      // Fallback: search by symbol
      if (!name) {
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${sym}`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json() as {
              coins: { name: string; symbol: string }[];
            };
            const match = data.coins.find(
              (c) => c.symbol.toUpperCase() === sym,
            );
            if (match) name = match.name;
          }
        } catch (_) { /* ignore */ }
      }
    } else {
      // Stock / ETF / bond etc — use Finnhub
      const token = Deno.env.get("FINNHUB_API_KEY");
      if (token) {
        await Promise.all([
          // Name from company profile
          fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${token}`,
          ).then(async (r) => {
            if (r.ok) {
              const d = await r.json() as { name?: string };
              if (d.name) name = d.name;
            }
          }).catch(() => {}),

          // Current price from quote
          fetch(
            `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${token}`,
          ).then(async (r) => {
            if (r.ok) {
              const d = await r.json() as { c?: number };
              if (d.c && d.c > 0) price = d.c;
            }
          }).catch(() => {}),
        ]);
      }
    }

    const result = { name, price };

    // Cache result
    await supabase.from("api_cache").upsert(
      { cache_key: cacheKey, response: result, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
      { onConflict: "cache_key" },
    );

    return json(result);
  } catch (err) {
    console.error("lookup-symbol error:", err);
    return json({ name: null, price: null });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
