import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchStockAnalysisInfo, parseSymbol } from "../_shared/price-providers/stockanalysis.ts";
import { toYahooSymbol } from "../_shared/price-providers/yahoo.ts";

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

// deno-lint-ignore no-explicit-any
function parseNum(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "object" && typeof v.raw === "number") return isFinite(v.raw) ? v.raw : null;
  return null;
}

function computeRating(t: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }): string {
  const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell;
  if (total === 0) return "Hold";
  const score = (t.strongBuy * 2 + t.buy - t.sell - t.strongSell * 2) / total;
  if (score > 1.5) return "Strong Buy";
  if (score > 0.5) return "Buy";
  if (score > -0.5) return "Hold";
  if (score > -1.5) return "Sell";
  return "Strong Sell";
}

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  try {
    const fcRes = await fetch("https://fc.yahoo.com", {
      headers: { ...YAHOO_HEADERS, "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    const rawCookies = fcRes.headers.getSetCookie
      ? fcRes.headers.getSetCookie()
      : (fcRes.headers.get("set-cookie") ?? "").split(/,(?=[^;]+=[^;]+;)/);
    await fcRes.body?.cancel();
    const cookieStr = rawCookies.map((c: string) => c.split(";")[0].trim()).filter(Boolean).join("; ");
    if (!cookieStr) return null;

    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...YAHOO_HEADERS, "Cookie": cookieStr },
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.startsWith("<") || crumb.length > 20) return null;
    return { crumb, cookie: cookieStr };
  } catch (e) {
    console.log("crumb error:", String(e));
    return null;
  }
}

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

export async function fetchYahooAssetInfo(yahooSym: string, assetType: string): Promise<Partial<AssetInfo>> {
  const info: Partial<AssetInfo> = {};
  const isHoldings = assetType === "etf" || assetType === "mutual_fund";

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSym)}&quotesCount=1&newsCount=0&enableFuzzyQuery=false`,
      { headers: YAHOO_HEADERS },
    );
    if (res.ok) {
      const data = await res.json() as {
        quotes?: Array<{ symbol?: string; sector?: string; industry?: string; region?: string; exchange?: string; exchDisp?: string }>;
      };
      const q = data.quotes?.find((q) => q.symbol?.toUpperCase() === yahooSym.toUpperCase()) ?? data.quotes?.[0];
      if (q) {
        info.sector = q.sector ?? null;
        info.industry = q.industry ?? null;
        info.country = q.region ?? null;
        info.exchange = q.exchDisp ?? q.exchange ?? null;
      }
    } else {
      await res.body?.cancel();
    }
  } catch (e) {
    console.log("yahoo search error:", String(e));
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSym)}&fields=trailingPE,epsTrailingTwelveMonths,sector,country,marketCap,fullExchangeName,exchange,targetMeanPrice`,
      { headers: YAHOO_HEADERS },
    );
    if (res.ok) {
      // deno-lint-ignore no-explicit-any
      const data = await res.json() as { quoteResponse?: { result?: any[] } };
      const q = data?.quoteResponse?.result?.[0];
      if (q) {
        const pe = parseNum(q.trailingPE);
        const eps = parseNum(q.epsTrailingTwelveMonths);
        if (pe != null && pe > 0) info.pe = pe;
        if (eps != null) info.eps = eps;
        info.sector ??= q.sector ?? null;
        info.country ??= q.country ?? null;
        info.marketCap ??= parseNum(q.marketCap);
        info.exchange ??= q.fullExchangeName ?? q.exchange ?? null;
        info.priceTarget ??= parseNum(q.targetMeanPrice);
      }
    } else {
      await res.body?.cancel();
    }
  } catch (e) {
    console.log("yahoo v7 error:", String(e));
  }

  const modules = isHoldings
    ? "summaryProfile,defaultKeyStatistics,recommendationTrend,topHoldings,financialData,price"
    : "summaryProfile,defaultKeyStatistics,recommendationTrend,financialData,price";
  const auth = await getYahooCrumb();
  const summaryUrls = auth
    ? [
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(auth.crumb)}&formatted=false`,
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(auth.crumb)}&formatted=false`,
    ]
    : [
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?formatted=false&modules=${encodeURIComponent(modules)}&corsDomain=finance.yahoo.com`,
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?formatted=false&modules=${encodeURIComponent(modules)}&corsDomain=finance.yahoo.com`,
    ];
  const authHeaders = auth ? { ...YAHOO_HEADERS, "Cookie": auth.cookie } : YAHOO_HEADERS;

  for (const url of summaryUrls) {
    try {
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) {
        await res.body?.cancel();
        continue;
      }
      // deno-lint-ignore no-explicit-any
      const data = await res.json() as { quoteSummary?: { result?: any[] | null } };
      const r = data?.quoteSummary?.result?.[0];
      if (!r) continue;

      info.sector ??= r.summaryProfile?.sector ?? null;
      info.industry ??= r.summaryProfile?.industry ?? null;
      info.country ??= r.summaryProfile?.country ?? null;
      info.website ??= r.summaryProfile?.website ?? null;
      info.employees ??= parseNum(r.summaryProfile?.fullTimeEmployees);
      if (!info.description && r.summaryProfile?.longBusinessSummary) {
        info.description = String(r.summaryProfile.longBusinessSummary).slice(0, 500);
      }

      const pe = parseNum(r.defaultKeyStatistics?.forwardPE ?? r.summaryDetail?.trailingPE);
      const eps = parseNum(r.defaultKeyStatistics?.trailingEps);
      if (info.pe == null && pe != null && pe > 0) info.pe = pe;
      if (info.eps == null && eps != null) info.eps = eps;
      info.marketCap ??= parseNum(r.price?.marketCap);
      info.exchange ??= r.price?.exchangeName ?? r.price?.exchange ?? null;
      info.priceTarget ??= parseNum(r.financialData?.targetMeanPrice);

      const trend = r.recommendationTrend?.trend?.find((t: { period: string }) => t.period === "0m");
      if (trend) {
        const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
        if (total > 0) {
          info.analystRating ??= computeRating(trend);
          info.analystCount ??= total;
        }
      }

      if (isHoldings && r.topHoldings?.holdings?.length > 0) {
        const top20 = r.topHoldings.holdings.slice(0, 20);
        const rest = r.topHoldings.holdings.slice(20);
        const mapped: Holding[] = top20.map((h: { symbol?: string; holdingName?: string; holdingPercent?: unknown }) => ({
          symbol: h.symbol ?? "",
          name: h.holdingName ?? h.symbol ?? "",
          pct: parseNum(h.holdingPercent) ?? 0,
        }));
        if (rest.length > 0) {
          mapped.push({
            symbol: "",
            name: "Other",
            pct: rest.reduce((s: number, h: { holdingPercent?: unknown }) => s + (parseNum(h.holdingPercent) ?? 0), 0),
          });
        }
        info.holdings = mapped;
      }
      break;
    } catch (e) {
      console.log("yahoo quoteSummary error:", String(e));
    }
  }

  return info;
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
