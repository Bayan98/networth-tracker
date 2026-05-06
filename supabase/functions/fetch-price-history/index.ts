import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { symbolToCoinGeckoId } from "../_shared/coingecko-symbol.ts";
import { fetchSAHistory, parseSymbol } from "../_shared/stockanalysis.ts";

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

const PERIOD_TTL_MS: Record<Period, number> = {
  "1w": 12 * 60 * 60 * 1000, // 12 hours
  "1m": 12 * 60 * 60 * 1000, // 12 hours
  "1y": 24 * 60 * 60 * 1000, // 24 hours
  "5y": 24 * 60 * 60 * 1000, // 24 hours
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
    if (period === "1y") {
      const key = isoWeekKey(d);
      if (!grouped.has(key)) grouped.set(key, p);
    } else {
      // Normalize to the 1st of the month so prices align exactly with the time
      // axis dates produced by buildTimeAxis("5y"). Without this, the first
      // trading day of each month (e.g. Jan 3) would sit after the axis date
      // (Jan 1) and nearestPriceForDate would return December's price instead.
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      if (!grouped.has(key)) grouped.set(key, { date: `${year}-${month}-01`, price: p.price });
    }
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
    const ttlMs = PERIOD_TTL_MS[period];
    const now = Date.now();

    // 5y:v2 — bumped when monthly aggregate switched to month-start date normalization
    const keyFor = (sym: string) => `history:${sym}:${period === "5y" ? "5y:v2" : period}`;
    const cacheKeys = items.map((i) => keyFor(i.symbol.toUpperCase()));
    const { data: cached } = await supabase
      .from("api_cache")
      .select("cache_key, response, expires_at")
      .in("cache_key", cacheKeys) as { data: Array<{ cache_key: string; response: { points: PricePoint[] }; expires_at: string | null }> | null };

    const cacheMap = new Map<string, PricePoint[]>();
    for (const row of cached ?? []) {
      const notExpired = row.expires_at != null && new Date(row.expires_at).getTime() > now;
      if (notExpired && Array.isArray(row.response?.points)) {
        cacheMap.set(row.cache_key, row.response.points);
      }
    }

    const history: Record<string, PricePoint[]> = {};
    const needCrypto: Array<{ symbol: string; cgId: string }> = [];
    const needPriceable: Array<{ symbol: string; asset_type: string }> = [];

    for (const item of items) {
      const sym = item.symbol.toUpperCase();
      const cacheKey = keyFor(sym);
      if (cacheMap.has(cacheKey)) {
        history[sym] = cacheMap.get(cacheKey)!;
      } else if (item.asset_type === "crypto") {
        const { ticker } = parseSymbol(sym);
        needCrypto.push({ symbol: sym, cgId: symbolToCoinGeckoId(ticker) });
      } else if (["stock", "etf", "bond", "mutual_fund", "commodity"].includes(item.asset_type)) {
        needPriceable.push({ symbol: sym, asset_type: item.asset_type });
      }
    }

    const toTs = Math.floor(now / 1000);
    const fromTs = toTs - days * 86400;

    for (const { symbol, cgId } of needCrypto) {
      let points: PricePoint[] | null = null;

      try {
        const url = `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json() as { prices: [number, number][] };
          const daily = cgToDailyPoints(data.prices ?? []);
          if (daily.length > 0) points = aggregate(daily, period);
        } else {
          console.warn(`CoinGecko ${cgId} returned ${res.status} — falling back to Yahoo Finance`);
        }
      } catch (e) {
        console.error(`CoinGecko history error for ${cgId}:`, e);
      }

      if (!points) {
        try {
          const yahooSym = `${symbol}-USD`;
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=1d&period1=${fromTs}&period2=${toTs}`;
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (res.ok) {
            const data = await res.json() as {
              chart: { result: Array<{ timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> | null };
            };
            const result = data.chart?.result?.[0];
            const closes = result?.indicators?.quote?.[0]?.close;
            if (result?.timestamp && closes) {
              const daily: PricePoint[] = result.timestamp
                .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), price: closes[i] }))
                .filter((p): p is PricePoint => p.price != null);
              if (daily.length > 0) points = aggregate(daily.sort((a, b) => a.date.localeCompare(b.date)), period);
            }
          }
        } catch (e) {
          console.error(`Yahoo Finance fallback error for ${symbol}-USD:`, e);
        }
      }

      if (points && points.length > 0) {
        history[symbol] = points;
        await supabase.from("api_cache").upsert(
          { cache_key: keyFor(symbol), response: { points }, updated_at: new Date().toISOString(), expires_at: new Date(now + ttlMs).toISOString() },
          { onConflict: "cache_key" },
        );
      }
    }

    // All priceable assets: StockAnalysis primary, Yahoo fallback for plain symbols
    if (needPriceable.length > 0) {
      await Promise.all(needPriceable.map(async ({ symbol: sym, asset_type }) => {
        const { exchange, ticker } = parseSymbol(sym);
        let points: PricePoint[] | null = null;

        const saPoints = await fetchSAHistory(sym, asset_type, fromTs, toTs);
        if (saPoints.length > 0) {
          points = aggregate(saPoints.sort((a, b) => a.date.localeCompare(b.date)), period);
        }

        // Yahoo fallback — use bare ticker for all symbols (exchange-prefixed uses ticker to find primary listing)
        if (!points) {
          try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${fromTs}&period2=${toTs}`;
            const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (res.ok) {
              const data = await res.json() as {
                chart: { result: Array<{ timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> | null };
              };
              const result = data.chart?.result?.[0];
              const closes = result?.indicators?.quote?.[0]?.close;
              if (result?.timestamp && closes) {
                const daily: PricePoint[] = result.timestamp
                  .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), price: closes[i] }))
                  .filter((p): p is PricePoint => p.price != null);
                if (daily.length > 0) points = aggregate(daily.sort((a, b) => a.date.localeCompare(b.date)), period);
              }
            }
          } catch (e) {
            console.error(`Yahoo Finance history error for ${sym}:`, e);
          }
        }

        if (points && points.length > 0) {
          history[sym] = points;
          await supabase.from("api_cache").upsert(
            { cache_key: keyFor(sym), response: { points }, updated_at: new Date().toISOString(), expires_at: new Date(now + ttlMs).toISOString() },
            { onConflict: "cache_key" },
          );
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
