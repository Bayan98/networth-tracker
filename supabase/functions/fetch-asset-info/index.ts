import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchStockAnalysisInfo, parseSymbol } from "../_shared/price-providers/stockanalysis/index.ts";
import { fetchYahooAssetInfo, toYahooSymbol } from "../_shared/price-providers/yahoo/index.ts";

export { fetchYahooAssetInfo };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNDAMENTALS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PRICEABLE = ["stock", "etf", "bond", "mutual_fund", "commodity", "crypto"];

export interface Holding {
  symbol: string;
  name: string;
  pct: number;
}

export interface AssetInfo {
  sector: string | null;
  industry: string | null;
  country: string | null;
  pe: number | null;
  eps: number | null;
  analystRating: string | null;
  analystCount: number | null;
  holdings: Holding[] | null;
  yahooUrl: string | null;
  description: string | null;
  website: string | null;
  employees: number | null;
  marketCap: number | null;
  exchange: string | null;
  priceTarget: number | null;
  dividend: string | null;
  beta: number | null;
  sources: string[] | null;
}

export interface FetchAssetInfoRequest {
  symbol: string;
  asset_type: string;
}

export interface CacheRow {
  cache_key: string;
  response: unknown;
  expires_at: string | null;
}

export interface CacheUpsert {
  cache_key: string;
  response: unknown;
  updated_at: string;
  expires_at: string;
}

export interface EdgeCache {
  getMany: (cacheKeys: string[]) => Promise<CacheRow[]>;
  upsert: (row: CacheUpsert) => Promise<void>;
}

export interface AssetInfoProviders {
  fetchStockAnalysisInfo: (symbol: string, assetType?: string) => Promise<Partial<AssetInfo>>;
  fetchYahooInfo: (yahooSymbol: string, assetType: string) => Promise<Partial<AssetInfo>>;
}

export interface FetchAssetInfoDeps {
  cache: EdgeCache;
  now?: () => number;
  providers?: AssetInfoProviders;
}

const DEFAULT_PROVIDERS: AssetInfoProviders = {
  fetchStockAnalysisInfo,
  fetchYahooInfo: fetchYahooAssetInfo,
};

const EMPTY_INFO: AssetInfo = {
  sector: null,
  industry: null,
  country: null,
  pe: null,
  eps: null,
  analystRating: null,
  analystCount: null,
  holdings: null,
  yahooUrl: null,
  description: null,
  website: null,
  employees: null,
  marketCap: null,
  exchange: null,
  priceTarget: null,
  dividend: null,
  beta: null,
  sources: null,
};

export async function handleFetchAssetInfo(
  payload: FetchAssetInfoRequest,
  deps: FetchAssetInfoDeps,
): Promise<AssetInfo> {
  const sym = payload.symbol?.toUpperCase().trim();
  const assetType = payload.asset_type;

  if (!sym || !PRICEABLE.includes(assetType)) return { ...EMPTY_INFO };

  const now = deps.now?.() ?? Date.now();
  const providers = deps.providers ?? DEFAULT_PROVIDERS;
  const infoKey = `asset-info:v8:${sym}`;
  const cached = await deps.cache.getMany([infoKey]);
  const cachedInfo = cached.find((row) => row.cache_key === infoKey);
  const infoFresh = Boolean(cachedInfo?.expires_at && new Date(cachedInfo.expires_at).getTime() > now);

  let info: Partial<AssetInfo> = infoFresh ? cachedInfo!.response as Partial<AssetInfo> : {};

  if (!infoFresh) {
    const { ticker } = parseSymbol(sym);
    const yahooSym = assetType === "crypto" ? `${ticker}-USD` : toYahooSymbol(sym);
    const yahooUrl = `https://finance.yahoo.com/quote/${yahooSym}/`;

    if (assetType === "crypto") {
      const yahooInfo = await safeAssetInfo(() => providers.fetchYahooInfo(yahooSym, assetType));
      info = {
        ...mergeAssetInfo({}, yahooInfo),
        yahooUrl,
        sources: hasAssetInfoValue(yahooInfo) ? ["Yahoo"] : null,
      };
    } else {
      const [stockAnalysisInfo, yahooInfo] = await Promise.all([
        safeAssetInfo(() => providers.fetchStockAnalysisInfo(sym, assetType)),
        safeAssetInfo(() => providers.fetchYahooInfo(yahooSym, assetType)),
      ]);

      const sources = [
        hasAssetInfoValue(stockAnalysisInfo) ? "StockAnalysis" : null,
        hasAssetInfoValue(yahooInfo) ? "Yahoo" : null,
      ].filter((provider): provider is string => provider !== null);

      info = { ...mergeAssetInfo(stockAnalysisInfo, yahooInfo), yahooUrl, sources: sources.length > 0 ? sources : null };
    }

    await deps.cache.upsert({
      cache_key: infoKey,
      response: info,
      updated_at: new Date(now).toISOString(),
      expires_at: new Date(now + FUNDAMENTALS_TTL_MS).toISOString(),
    });
  }

  return {
    sector: info.sector ?? null,
    industry: info.industry ?? null,
    country: info.country ?? null,
    pe: info.pe ?? null,
    eps: info.eps ?? null,
    analystRating: info.analystRating ?? null,
    analystCount: info.analystCount ?? null,
    holdings: info.holdings ?? null,
    yahooUrl: info.yahooUrl ?? null,
    description: info.description ?? null,
    website: info.website ?? null,
    employees: info.employees ?? null,
    marketCap: info.marketCap ?? null,
    exchange: info.exchange ?? null,
    priceTarget: info.priceTarget ?? null,
    dividend: info.dividend ?? null,
    beta: info.beta ?? null,
    sources: info.sources ?? null,
  };
}

function mergeAssetInfo(primary: Partial<AssetInfo>, fallback: Partial<AssetInfo>): Partial<AssetInfo> {
  return {
    sector: primary.sector ?? fallback.sector ?? null,
    industry: primary.industry ?? fallback.industry ?? null,
    country: primary.country ?? fallback.country ?? null,
    pe: primary.pe ?? fallback.pe ?? null,
    eps: primary.eps ?? fallback.eps ?? null,
    analystRating: primary.analystRating ?? fallback.analystRating ?? null,
    analystCount: primary.analystCount ?? fallback.analystCount ?? null,
    holdings: primary.holdings ?? fallback.holdings ?? null,
    description: primary.description ?? fallback.description ?? null,
    website: primary.website ?? fallback.website ?? null,
    employees: primary.employees ?? fallback.employees ?? null,
    marketCap: primary.marketCap ?? fallback.marketCap ?? null,
    exchange: primary.exchange ?? fallback.exchange ?? null,
    priceTarget: primary.priceTarget ?? fallback.priceTarget ?? null,
    dividend: primary.dividend ?? fallback.dividend ?? null,
    beta: primary.beta ?? fallback.beta ?? null,
  };
}

function hasAssetInfoValue(info: Partial<AssetInfo>): boolean {
  return info.sector != null ||
    info.industry != null ||
    info.country != null ||
    info.pe != null ||
    info.eps != null ||
    info.analystRating != null ||
    info.analystCount != null ||
    (Array.isArray(info.holdings) && info.holdings.length > 0) ||
    info.description != null ||
    info.website != null ||
    info.employees != null ||
    info.marketCap != null ||
    info.exchange != null ||
    info.priceTarget != null ||
    info.dividend != null ||
    info.beta != null;
}

async function safeAssetInfo(fn: () => Promise<Partial<AssetInfo>>): Promise<Partial<AssetInfo>> {
  try {
    return await fn();
  } catch {
    return {};
  }
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const body = await req.json() as FetchAssetInfoRequest;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      return json(await handleFetchAssetInfo(body, { cache: createSupabaseCache(supabase) }));
    } catch (err) {
      console.error("fetch-asset-info error:", err);
      return json({ ...EMPTY_INFO });
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
