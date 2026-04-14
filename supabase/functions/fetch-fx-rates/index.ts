import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TTL_LATEST_MS     = 60 * 60 * 1000;           // 1 hour
const TTL_HISTORICAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// Earliest date available from fawazahmed0/exchange-api
const EXCHANGE_API_EARLIEST = "2024-03-06";

// Currencies covered by the National Bank of Kazakhstan (historical data from ~2000)
const NBK_CURRENCIES = new Set([
  "AED", "AMD", "AUD", "AZN", "BRL", "BYN", "CAD", "CHF", "CNY", "CZK",
  "DKK", "EUR", "GBP", "GEL", "HKD", "HUF", "INR", "IRR", "JPY", "KGS",
  "KRW", "KWD", "KZT", "MDL", "MXN", "MYR", "NOK", "PLN", "RUB", "SAR",
  "SEK", "SGD", "TJS", "THB", "TRY", "UAH", "USD", "UZS", "XDR", "ZAR",
]);

interface FxPair { from: string; to: string; date: string }

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function tryFetchNbkRates(dateStr: string): Promise<Record<string, number> | null> {
  const [year, month, day] = dateStr.split("-");
  const fdate = `${day}.${month}.${year}`;
  try {
    const res = await fetch(`https://nationalbank.kz/rss/get_rates.cfm?fdate=${fdate}`);
    if (!res.ok) return null;
    const text = await res.text();
    const kztRates: Record<string, number> = { KZT: 1 };
    const regex = /<item>[\s\S]*?<title>([\w]+)<\/title>[\s\S]*?<description>([\d.]+)<\/description>[\s\S]*?<quant>(\d+)<\/quant>[\s\S]*?<\/item>/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      kztRates[match[1].trim()] = parseFloat(match[2]) / parseInt(match[3]);
    }
    return Object.keys(kztRates).length > 1 ? kztRates : null;
  } catch (e) {
    console.error(`[FX] NBK ${dateStr} failed:`, e);
    return null;
  }
}

async function fetchNbkRates(date: string): Promise<Record<string, number> | null> {
  // NBK has no data on weekends/holidays — try up to 7 days back
  const d = new Date(date);
  for (let offset = 0; offset <= 7; offset++) {
    const tryDate = new Date(d);
    tryDate.setDate(d.getDate() - offset);
    const result = await tryFetchNbkRates(tryDate.toISOString().slice(0, 10));
    if (result) return result;
  }
  console.error(`[FX] NBK: no rates found for ${date} or 7 days prior`);
  return null;
}

function nbkCrossRate(kztRates: Record<string, number>, from: string, to: string): number | null {
  const fromKzt = kztRates[from];
  const toKzt = kztRates[to];
  if (fromKzt == null || toKzt == null) return null;
  return fromKzt / toKzt;
}

async function fetchExchangeApiRates(base: string, date: string, today: string): Promise<Record<string, number> | null> {
  const lower = base.toLowerCase();
  const isToday = date === today;

  const urls = isToday
    ? [
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${lower}.json`,
        `https://latest.currency-api.pages.dev/v1/currencies/${lower}.json`,
      ]
    : [
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${lower}.json`,
        `https://${date}.currency-api.pages.dev/v1/currencies/${lower}.json`,
      ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const rates = data[lower] as Record<string, number> | undefined;
      if (rates) return rates;
    } catch (e) {
      console.error(`[FX] ${url} failed:`, e);
    }
  }
  return null;
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
      .select("cache_key, response, expires_at")
      .in("cache_key", cacheKeys) as {
        data: Array<{ cache_key: string; response: { rate: number; latest?: boolean; clamped?: boolean }; expires_at: string | null }> | null;
      };

    const now = Date.now();
    const cachedKeys = new Set<string>();
    const clampedPairs = new Set<string>();

    for (const row of cached ?? []) {
      const notExpired = row.expires_at != null && new Date(row.expires_at).getTime() > now;
      if (notExpired && row.response?.rate != null) {
        cachedKeys.add(row.cache_key);
        const [, from, to, date] = row.cache_key.split(":");
        rates[`${from}_${to}_${date}`] = row.response.rate;
        if (row.response.clamped) {
          clampedPairs.add(`${from}->${to}`);
        }
      }
    }

    const missingPairs = uniquePairs.filter(
      (p) => !cachedKeys.has(`fx:${p.from}:${p.to}:${p.date}`),
    );

    if (missingPairs.length === 0) {
      const result: Record<string, unknown> = { rates };
      if (clampedPairs.size > 0) {
        result.clamped_pairs = [...clampedPairs];
        result.clamped_from = EXCHANGE_API_EARLIEST;
      }
      return jsonResponse(result);
    }

    const today = new Date().toISOString().slice(0, 10);
    const upserts: Array<{ cache_key: string; response: { rate: number; latest?: boolean; clamped?: boolean }; updated_at: string; expires_at: string }> = [];

    const nbkPairs = missingPairs.filter((p) => NBK_CURRENCIES.has(p.from) && NBK_CURRENCIES.has(p.to));
    const exPairs  = missingPairs.filter((p) => !NBK_CURRENCIES.has(p.from) || !NBK_CURRENCIES.has(p.to));

    // NBK: one request per date covers all currencies for that date
    if (nbkPairs.length > 0) {
      const nbkByDate = Map.groupBy(nbkPairs, (p) => p.date);

      await Promise.all(
        Array.from(nbkByDate.entries()).map(async ([date, datePairs]) => {
          const kztRates = await fetchNbkRates(date);
          if (!kztRates) return;

          const isLatest = date === today;
          const updatedAt = new Date().toISOString();

          for (const p of datePairs) {
            const rate = nbkCrossRate(kztRates, p.from, p.to);
            if (rate == null) continue;

            const ttlMs = isLatest ? TTL_LATEST_MS : TTL_HISTORICAL_MS;
            rates[`${p.from}_${p.to}_${p.date}`] = rate;
            upserts.push({
              cache_key: `fx:${p.from}:${p.to}:${p.date}`,
              response: isLatest ? { rate, latest: true } : { rate },
              updated_at: updatedAt,
              expires_at: new Date(now + ttlMs).toISOString(),
            });
          }
        }),
      );
    }

    // exchange-api: group by (from, fetchDate) to minimize requests
    if (exPairs.length > 0) {
      const exByGroup = new Map<string, { from: string; fetchDate: string; pairs: typeof exPairs }>();

      for (const p of exPairs) {
        const fetchDate = p.date < EXCHANGE_API_EARLIEST ? EXCHANGE_API_EARLIEST : p.date;
        if (p.date < EXCHANGE_API_EARLIEST) {
          clampedPairs.add(`${p.from}->${p.to}`);
        }
        const key = `${p.from}_${fetchDate}`;
        if (!exByGroup.has(key)) exByGroup.set(key, { from: p.from, fetchDate, pairs: [] });
        exByGroup.get(key)!.pairs.push(p);
      }

      await Promise.all(
        Array.from(exByGroup.values()).map(async ({ from, fetchDate, pairs: groupPairs }) => {
          const apiRates = await fetchExchangeApiRates(from, fetchDate, today);
          if (!apiRates) return;

          const updatedAt = new Date().toISOString();

          for (const p of groupPairs) {
            const rate = apiRates[p.to.toLowerCase()];
            if (rate == null) continue;

            const isLatest = p.date === today;
            const isClamped = p.date < EXCHANGE_API_EARLIEST;
            const ttlMs = isLatest ? TTL_LATEST_MS : TTL_HISTORICAL_MS;
            rates[`${p.from}_${p.to}_${p.date}`] = rate;
            upserts.push({
              cache_key: `fx:${p.from}:${p.to}:${p.date}`,
              response: isLatest ? { rate, latest: true } : isClamped ? { rate, clamped: true } : { rate },
              updated_at: updatedAt,
              expires_at: new Date(now + ttlMs).toISOString(),
            });
          }
        }),
      );
    }

    if (upserts.length > 0) {
      await supabase.from("api_cache").upsert(upserts, { onConflict: "cache_key" });
    }

    const result: Record<string, unknown> = { rates };
    if (clampedPairs.size > 0) {
      result.clamped_pairs = [...clampedPairs];
      result.clamped_from = EXCHANGE_API_EARLIEST;
    }

    return jsonResponse(result);
  } catch (err) {
    console.error("fetch-fx-rates error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
