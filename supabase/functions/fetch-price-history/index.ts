import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Period = "1w" | "1m" | "1y" | "5y";

const PERIOD_DAYS: Record<Period, number> = {
  "1w": 7,
  "1m": 30,
  "1y": 365,
  "5y": 1825,
};

const PERIOD_TTL: Record<Period, number> = {
  "1w": 43200,
  "1m": 43200,
  "1y": 86400,
  "5y": 86400,
};

interface PricePoint {
  date: string;
  price: number;
}

function aggregate(points: PricePoint[], period: Period): PricePoint[] {
  if (period === "1w" || period === "1m") return points;

  const grouped = new Map<string, PricePoint>();
  for (const p of points) {
    const d = new Date(p.date + "T12:00:00Z");
    const key = period === "1y"
      ? isoWeekKey(d)
      : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    grouped.set(key, p);
  }
  return Array.from(grouped.values());
}

function isoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function cgToDailyPoints(rawPrices: [number, number][]): PricePoint[] {
  const daily = new Map<string, number>();
  for (const [ts, price] of rawPrices) {
    const date = new Date(ts).toISOString().slice(0, 10);
    daily.set(date, price);
  }
  return Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json() as {
      items: Array<{ symbol: string; asset_type: string }>;
      period: Period;
    };
    const { items, period } = body;

    if (!Array.isArray(items) || items.length === 0 || !PERIOD_DAYS[period]) {
      return new Response(JSON.stringify({ history: {} }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const days = PERIOD_DAYS[period];
    const ttl = PERIOD_TTL[period];
    const now = Date.now();

    const cacheKeys = items.map((i) => `history:${i.symbol.toUpperCase()}:${period}`);
    const { data: cached } = await supabase
      .from("api_cache")
      .select("cache_key, response, updated_at")
      .in("cache_key", cacheKeys) as { data: Array<{ cache_key: string; response: { points: PricePoint[] }; updated_at: string }> | null };

    const cacheMap = new Map<string, PricePoint[]>();
    for (const row of cached ?? []) {
      const age = (now - new Date(row.updated_at).getTime()) / 1000;
      if (age < ttl && Array.isArray(row.response?.points)) {
        cacheMap.set(row.cache_key, row.response.points);
      }
    }

    const history: Record<string, PricePoint[]> = {};
    const needCrypto: Array<{ symbol: string; cgId: string }> = [];
    const needStocks: string[] = [];

    for (const item of items) {
      const sym = item.symbol.toUpperCase();
      const cacheKey = `history:${sym}:${period}`;
      if (cacheMap.has(cacheKey)) {
        history[sym] = cacheMap.get(cacheKey)!;
      } else if (item.asset_type === "crypto") {
        needCrypto.push({ symbol: sym, cgId: symbolToCoinGeckoId(sym) });
      } else if (["stock", "etf", "bond", "mutual_fund", "commodity"].includes(item.asset_type)) {
        needStocks.push(sym);
      }
    }

    for (const { symbol, cgId } of needCrypto) {
      try {
        const url = `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json() as { prices: [number, number][] };
          const daily = cgToDailyPoints(data.prices ?? []);
          const points = aggregate(daily, period);
          history[symbol] = points;
          await supabase.from("api_cache").upsert(
            { cache_key: `history:${symbol}:${period}`, response: { points }, updated_at: new Date().toISOString() },
            { onConflict: "cache_key" },
          );
        }
      } catch (e) {
        console.error(`CoinGecko history error for ${cgId}:`, e);
      }
    }

    const finnhubToken = Deno.env.get("FINNHUB_API_KEY");
    if (needStocks.length > 0 && finnhubToken) {
      const toTs = Math.floor(now / 1000);
      const fromTs = toTs - days * 86400;

      await Promise.all(needStocks.map(async (sym) => {
        try {
          const url = `https://finnhub.io/api/v1/stock/candle?symbol=${sym}&resolution=D&from=${fromTs}&to=${toTs}&token=${finnhubToken}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json() as { c: number[]; t: number[]; s: string };
            if (data.s === "ok" && Array.isArray(data.c) && data.c.length > 0) {
              const daily: PricePoint[] = data.t.map((ts, i) => ({
                date: new Date(ts * 1000).toISOString().slice(0, 10),
                price: data.c[i],
              }));
              const points = aggregate(daily.sort((a, b) => a.date.localeCompare(b.date)), period);
              history[sym] = points;
              await supabase.from("api_cache").upsert(
                { cache_key: `history:${sym}:${period}`, response: { points }, updated_at: new Date().toISOString() },
                { onConflict: "cache_key" },
              );
            }
          }
        } catch (e) {
          console.error(`Finnhub history error for ${sym}:`, e);
        }
      }));
    }

    return new Response(JSON.stringify({ history }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-price-history error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
