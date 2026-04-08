import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FRANKFURTER_CURRENCIES = new Set([
  "AUD", "BGN", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK",
  "EUR", "GBP", "HKD", "HUF", "IDR", "ILS", "INR", "ISK",
  "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PHP", "PLN",
  "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR",
]);

const TTL_HISTORICAL = 604800;
const TTL_LATEST = 86400;

interface FxPair { from: string; to: string; date: string }

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { pairs } = await req.json() as { pairs: FxPair[] };

    if (!Array.isArray(pairs) || pairs.length === 0) return jsonResponse({ rates: {} });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rates: Record<string, number> = {};

    const uniquePairs = [
      ...new Map(
        pairs
          .filter((p) => p.from.toUpperCase() !== p.to.toUpperCase())
          .map((p) => {
            const from = p.from.toUpperCase();
            const to = p.to.toUpperCase();
            return [`${from}_${to}_${p.date}`, { from, to, date: p.date }] as const;
          }),
      ).values(),
    ];

    if (uniquePairs.length === 0) return jsonResponse({ rates });

    const cacheKeys = uniquePairs.map((p) => `fx:${p.from}:${p.to}:${p.date}`);
    const { data: cached } = await supabase
      .from("api_cache")
      .select("cache_key, response, updated_at")
      .in("cache_key", cacheKeys) as {
        data: Array<{ cache_key: string; response: { rate: number; latest?: boolean }; updated_at: string }> | null;
      };

    const now = Date.now();
    const cachedKeys = new Set<string>();

    for (const row of cached ?? []) {
      const ttl = row.response?.latest ? TTL_LATEST : TTL_HISTORICAL;
      const age = (now - new Date(row.updated_at).getTime()) / 1000;
      if (age < ttl && row.response?.rate != null) {
        cachedKeys.add(row.cache_key);
        const [, from, to, date] = row.cache_key.split(":");
        rates[`${from}_${to}_${date}`] = row.response.rate;
      }
    }

    const missingPairs = uniquePairs.filter(
      (p) => !cachedKeys.has(`fx:${p.from}:${p.to}:${p.date}`),
    );

    if (missingPairs.length === 0) return jsonResponse({ rates });

    const frankfurterPairs: typeof missingPairs = [];
    const openErPairs: typeof missingPairs = [];

    for (const p of missingPairs) {
      if (FRANKFURTER_CURRENCIES.has(p.from) && FRANKFURTER_CURRENCIES.has(p.to)) {
        frankfurterPairs.push(p);
      } else {
        openErPairs.push(p);
      }
    }

    const upserts: Array<{ cache_key: string; response: { rate: number; latest?: boolean }; updated_at: string }> = [];

    if (frankfurterPairs.length > 0) {
      const groups = new Map<string, { from: string; to: string; dates: string[] }>();
      for (const p of frankfurterPairs) {
        const key = `${p.from}_${p.to}`;
        if (!groups.has(key)) groups.set(key, { from: p.from, to: p.to, dates: [] });
        groups.get(key)!.dates.push(p.date);
      }

      await Promise.all(
        Array.from(groups.values()).map(async ({ from, to, dates }) => {
          const sorted = [...dates].sort();
          const minDate = sorted[0];
          const maxDate = sorted[sorted.length - 1];

          try {
            const isSingle = minDate === maxDate;
            const url = isSingle
              ? `https://api.frankfurter.app/${minDate}?from=${from}&to=${to}`
              : `https://api.frankfurter.app/${minDate}..${maxDate}?from=${from}&to=${to}`;

            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();

            const dateRateMap = new Map<string, number>();
            if (isSingle) {
              const rate = (data.rates as Record<string, number>)?.[to];
              if (rate != null) dateRateMap.set((data.date as string) ?? minDate, rate);
            } else {
              for (const [d, r] of Object.entries(data.rates ?? {})) {
                const rate = (r as Record<string, number>)[to];
                if (rate != null) dateRateMap.set(d, rate);
              }
            }

            const availableDates = [...dateRateMap.keys()].sort();

            for (const requestedDate of dates) {
              let rate = dateRateMap.get(requestedDate);
              if (rate == null) {
                const prev = availableDates.filter((d) => d <= requestedDate);
                if (prev.length > 0) rate = dateRateMap.get(prev[prev.length - 1]);
              }
              if (rate == null && availableDates.length > 0) {
                rate = dateRateMap.get(availableDates[0]);
              }
              if (rate != null) {
                rates[`${from}_${to}_${requestedDate}`] = rate;
                upserts.push({
                  cache_key: `fx:${from}:${to}:${requestedDate}`,
                  response: { rate },
                  updated_at: new Date().toISOString(),
                });
              }
            }
          } catch (e) {
            console.error(`Frankfurter error ${from}→${to}:`, e);
          }
        }),
      );
    }

    if (openErPairs.length > 0) {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/USD`);
        if (res.ok) {
          const data = await res.json() as { rates: Record<string, number> };
          const usdRates: Record<string, number> = { USD: 1, ...data.rates };

          for (const p of openErPairs) {
            const fromRate = usdRates[p.from];
            const toRate = usdRates[p.to];
            if (fromRate == null || toRate == null) continue;

            const rate = toRate / fromRate;
            rates[`${p.from}_${p.to}_${p.date}`] = rate;
            upserts.push({
              cache_key: `fx:${p.from}:${p.to}:${p.date}`,
              response: { rate, latest: true },
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.error(`open.er-api.com error:`, e);
      }
    }

    if (upserts.length > 0) {
      await supabase.from("api_cache").upsert(upserts, { onConflict: "cache_key" });
    }

    return jsonResponse({ rates });
  } catch (err) {
    console.error("fetch-fx-rates error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
