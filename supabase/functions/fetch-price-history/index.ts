import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { coinGeckoIdForSymbol } from "../_shared/price-providers/coingecko.ts";
import { parseSymbol } from "../_shared/price-providers/stockanalysis.ts";
import type { PricePoint } from "../_shared/price-providers/yahoo.ts";
import { fetchCryptoHistoryFlow, type CryptoHistoryItem } from "./crypto_flow.ts";
import { fetchPriceableHistoryFlow, type PriceableHistoryItem } from "./priceable_flow.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type Period = "1w" | "1m" | "1y" | "5y";

const PERIOD_DAYS: Record<Period, number> = {
  "1w": 7,
  "1m": 30,
  "1y": 365,
  "5y": 1825,
};

const PRICEABLE_TYPES = ["stock", "etf", "bond", "mutual_fund", "commodity"];

export interface RequestItem {
  symbol: string;
  asset_type: string;
}

export interface CacheRow {
  cache_key: string;
  response: { points: PricePoint[]; currency?: string };
  expires_at: string | null;
}

export interface CacheUpsert {
  cache_key: string;
  response: { points: PricePoint[]; currency?: string };
  updated_at: string;
  expires_at: string;
}

export interface EdgeCache {
  getMany: (cacheKeys: string[]) => Promise<CacheRow[]>;
  upsert: (row: CacheUpsert) => Promise<void>;
}

export interface FetchPriceHistoryDeps {
  cache: EdgeCache;
  now?: () => number;
  fetchCryptoHistoryFlow?: typeof fetchCryptoHistoryFlow;
  fetchPriceableHistoryFlow?: typeof fetchPriceableHistoryFlow;
}

export interface FetchPriceHistoryRequest {
  items: RequestItem[];
  period: Period;
}

export interface FetchPriceHistoryResponse {
  history: Record<string, PricePoint[]>;
  currencies?: Record<string, string>;
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

function cacheKeyFor(sym: string, assetType: string, period: Period): string {
  if (assetType === "crypto") return `history:${sym}:${period}:crypto:n5`;
  return period === "5y" ? `history:${sym}:5y-monthly:n5` : `history:${sym}:5y-daily:n5`;
}

function ttlFor(period: Period): number {
  return period === "5y" ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
}

export async function handleFetchPriceHistory(
  payload: FetchPriceHistoryRequest,
  deps: FetchPriceHistoryDeps,
): Promise<FetchPriceHistoryResponse> {
  const { items, period } = payload;
  if (!Array.isArray(items) || items.length === 0 || !PERIOD_DAYS[period]) {
    return { history: {} };
  }

  const now = deps.now?.() ?? Date.now();
  const days = PERIOD_DAYS[period];
  const ttlMs = ttlFor(period);
  const toTs = Math.floor(now / 1000);
  const fromTs = toTs - days * 86400;
  const fetchFromTs = toTs - PERIOD_DAYS["5y"] * 86400;
  const loadCryptoHistory = deps.fetchCryptoHistoryFlow ?? fetchCryptoHistoryFlow;
  const loadPriceableHistory = deps.fetchPriceableHistoryFlow ?? fetchPriceableHistoryFlow;

  function filterAndAggregate(rawPoints: PricePoint[]): PricePoint[] {
    const fromDay = Math.floor(fromTs / 86400) * 86400;
    const filtered = rawPoints.filter((p) => {
      const ts = new Date(p.date + "T00:00:00Z").getTime() / 1000;
      return ts >= fromDay && ts <= toTs;
    });
    return aggregate(filtered, period);
  }

  const cacheKeys = items.map((i) => cacheKeyFor(i.symbol.toUpperCase(), i.asset_type, period));
  const cached = await deps.cache.getMany(cacheKeys);
  const cacheMap = new Map<string, { points: PricePoint[]; currency?: string }>();
  for (const row of cached) {
    const notExpired = row.expires_at != null && new Date(row.expires_at).getTime() > now;
    if (notExpired && Array.isArray(row.response?.points)) {
      cacheMap.set(row.cache_key, { points: row.response.points, currency: row.response.currency });
    }
  }

  const history: Record<string, PricePoint[]> = {};
  const currencies: Record<string, string> = {};
  const needCrypto: CryptoHistoryItem[] = [];
  const needPriceable: PriceableHistoryItem[] = [];

  for (const item of items) {
    const sym = item.symbol.toUpperCase();
    const cacheKey = cacheKeyFor(sym, item.asset_type, period);
    const cachedItem = cacheMap.get(cacheKey);
    if (cachedItem) {
      history[sym] = item.asset_type === "crypto" ? cachedItem.points : filterAndAggregate(cachedItem.points);
      if (cachedItem.currency) currencies[sym] = cachedItem.currency;
      continue;
    }

    if (item.asset_type === "crypto") {
      const { ticker } = parseSymbol(sym);
      needCrypto.push({ symbol: sym, cgId: coinGeckoIdForSymbol(ticker) });
    } else if (PRICEABLE_TYPES.includes(item.asset_type)) {
      needPriceable.push({ symbol: sym, asset_type: item.asset_type });
    }
  }

  const cryptoResults = await loadCryptoHistory(needCrypto, days, fromTs, toTs);
  for (const result of cryptoResults) {
    const points = aggregate(result.points, period);
    if (points.length === 0) continue;
    history[result.symbol] = points;
    await deps.cache.upsert({
      cache_key: cacheKeyFor(result.symbol, "crypto", period),
      response: { points },
      updated_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString(),
    });
  }

  const priceableResults = await loadPriceableHistory(needPriceable, fetchFromTs, toTs, period);
  for (const result of priceableResults) {
    if (result.points.length === 0) continue;
    history[result.symbol] = filterAndAggregate(result.points);
    if (result.currency) currencies[result.symbol] = result.currency;
    await deps.cache.upsert({
      cache_key: cacheKeyFor(result.symbol, result.asset_type, period),
      response: { points: result.points, currency: result.currency },
      updated_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString(),
    });
  }

  return { history, currencies };
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const body = await req.json() as FetchPriceHistoryRequest;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      return json(await handleFetchPriceHistory(body, { cache: createSupabaseCache(supabase) }));
    } catch (err) {
      console.error("fetch-price-history error:", err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  });
}

// deno-lint-ignore no-explicit-any
function createSupabaseCache(supabase: any): EdgeCache {
  return {
    async getMany(cacheKeys) {
      const { data, error } = await supabase
        .from("api_cache")
        .select("cache_key, response, expires_at")
        .in("cache_key", cacheKeys);
      if (error) throw error;
      return (data ?? []) as CacheRow[];
    },
    async upsert(row) {
      const { error } = await supabase.from("api_cache").upsert(row, { onConflict: "cache_key" });
      if (error) throw error;
    },
  };
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
