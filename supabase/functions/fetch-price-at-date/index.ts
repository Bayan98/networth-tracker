import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { symbol, asset_type, date } = await req.json() as { symbol: string; asset_type: string; date: string };
    const sym = symbol.toUpperCase().trim();
    const today = new Date().toISOString().slice(0, 10);
    const isToday = date === today;
    const TTL = isToday ? 3 * 60 * 60 * 1000 : 4 * 7 * 24 * 60 * 60 * 1000;

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

    let price: number | null = null;

    if (["stock", "etf", "bond", "mutual_fund", "commodity"].includes(asset_type)) {
      const dateEpoch = new Date(date + "T12:00:00Z").getTime() / 1000;
      const period1 = Math.floor(dateEpoch) - 86400;
      const period2 = Math.floor(dateEpoch) + 86400;
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&period1=${period1}&period2=${period2}`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (res.ok) {
          const data = await res.json() as {
            chart: {
              result?: Array<{
                meta?: { regularMarketPrice?: number };
                timestamp?: number[];
                indicators?: { quote: Array<{ close: (number | null)[] }> };
              }> | null;
            };
          };
          const result = data.chart?.result?.[0];
          if (isToday) {
            price = result?.meta?.regularMarketPrice ?? null;
          } else {
            const timestamps = result?.timestamp ?? [];
            const closes = result?.indicators?.quote?.[0]?.close ?? [];
            let minDiff = Infinity;
            for (let i = 0; i < timestamps.length; i++) {
              const diff = Math.abs(timestamps[i] - dateEpoch);
              if (closes[i] != null && diff < minDiff) {
                minDiff = diff;
                price = closes[i];
              }
            }
          }
        }
      } catch (e) {
        console.error(`fetch-price-at-date Yahoo error for ${sym}:`, e);
      }
    } else if (asset_type === "crypto") {
      if (isToday) {
        try {
          const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${sym}-USD`;
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (res.ok) {
            const data = await res.json() as { quoteResponse?: { result?: Array<{ regularMarketPrice?: number }> } };
            price = data.quoteResponse?.result?.[0]?.regularMarketPrice ?? null;
          }
        } catch (_) { /* ignore */ }
      } else {
        // CoinGecko historical: date format DD-MM-YYYY
        const cgId = symbolToCoinGeckoId(sym);
        const [yyyy, mm, dd] = date.split("-");
        const cgDate = `${dd}-${mm}-${yyyy}`;
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${cgId}/history?date=${cgDate}`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json() as { market_data?: { current_price?: { usd?: number } } };
            price = data.market_data?.current_price?.usd ?? null;
          }
        } catch (_) { /* ignore */ }

        // Fallback: Yahoo Finance crypto history
        if (price == null) {
          const dateEpoch = new Date(date + "T12:00:00Z").getTime() / 1000;
          try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}-USD?interval=1d&period1=${Math.floor(dateEpoch) - 86400}&period2=${Math.floor(dateEpoch) + 86400}`;
            const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (res.ok) {
              const data = await res.json() as {
                chart: { result?: Array<{ indicators?: { quote: Array<{ close: (number | null)[] }> } }> | null };
              };
              const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
              price = closes.find((c) => c != null) ?? null;
            }
          } catch (_) { /* ignore */ }
        }
      }
    }

    const result = { price };
    await supabase.from("api_cache").upsert(
      { cache_key: cacheKey, response: result, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + TTL).toISOString() },
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
