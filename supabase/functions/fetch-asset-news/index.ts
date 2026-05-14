import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchStockAnalysisNews, parseSymbol } from "../_shared/price-providers/stockanalysis/index.ts";
import { fetchYahooNews, toYahooSymbol } from "../_shared/price-providers/yahoo/index.ts";
import { filterReachableNews, type NewsItem } from "../_shared/news-utils.ts";

export { filterReachableNews, type NewsItem };
export { fetchYahooNews };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NEWS_TTL_MS = 6 * 60 * 60 * 1000;
const PRICEABLE = ["stock", "etf", "bond", "mutual_fund", "commodity", "crypto"];

export interface FetchAssetNewsRequest {
  symbol: string;
  asset_type: string;
  name?: string | null;
}

export interface FetchAssetNewsResponse {
  news: NewsItem[] | null;
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

export interface AssetNewsProviders {
  fetchStockAnalysisNews: (symbol: string, assetType?: string) => Promise<NewsItem[] | null>;
  fetchYahooNews: (yahooSymbol: string) => Promise<NewsItem[] | null>;
}

export interface FetchAssetNewsDeps {
  cache: EdgeCache;
  now?: () => number;
  providers?: AssetNewsProviders;
}

const DEFAULT_PROVIDERS: AssetNewsProviders = {
  fetchStockAnalysisNews: fetchStockAnalysisNews,
  fetchYahooNews: fetchYahooNews,
};

export async function handleFetchAssetNews(
  payload: FetchAssetNewsRequest,
  deps: FetchAssetNewsDeps,
): Promise<FetchAssetNewsResponse> {
  const sym = payload.symbol?.toUpperCase().trim();
  const assetType = payload.asset_type;

  if (!sym || !PRICEABLE.includes(assetType)) return { news: null };

  const now = deps.now?.() ?? Date.now();
  const cacheKey = `asset-news:v9:${sym}`;
  const cached = await deps.cache.getMany([cacheKey]);
  const cachedNews = cached.find((row) => row.cache_key === cacheKey);
  const newsFresh = Boolean(cachedNews?.expires_at && new Date(cachedNews.expires_at).getTime() > now);

  if (newsFresh) {
    return { news: cachedNews!.response as NewsItem[] | null };
  }

  const providers = deps.providers ?? DEFAULT_PROVIDERS;
  const { ticker } = parseSymbol(sym);
  const yahooSym = assetType === "crypto" ? `${ticker}-USD` : toYahooSymbol(sym);
  const news = assetType === "crypto"
    ? await filterReachableNews(filterYahooNewsForAsset(
      await safeNews(() => providers.fetchYahooNews(yahooSym)),
      sym,
      yahooSym,
      payload.name,
    ))
    : await fetchProviderNews(sym, assetType, yahooSym, payload.name, providers);

  await deps.cache.upsert({
    cache_key: cacheKey,
    response: news,
    updated_at: new Date(now).toISOString(),
    expires_at: new Date(now + NEWS_TTL_MS).toISOString(),
  });

  return { news };
}

async function fetchProviderNews(
  sym: string,
  assetType: string,
  yahooSym: string,
  assetName: string | null | undefined,
  providers: AssetNewsProviders,
): Promise<NewsItem[] | null> {
  const [stockAnalysisNews, yahooNews] = await Promise.all([
    safeNews(() => providers.fetchStockAnalysisNews(sym, assetType)),
    safeNews(() => providers.fetchYahooNews(yahooSym)),
  ]);

  const filteredStockAnalysisNews = await filterReachableNews(stockAnalysisNews);
  if (filteredStockAnalysisNews) return filteredStockAnalysisNews;

  return await filterReachableNews(filterYahooNewsForAsset(yahooNews, sym, yahooSym, assetName));
}

async function safeNews(fn: () => Promise<NewsItem[] | null>): Promise<NewsItem[] | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function filterYahooNewsForAsset(
  news: NewsItem[] | null,
  symbol: string,
  yahooSymbol: string,
  assetName?: string | null,
): NewsItem[] | null {
  if (!news?.length) return null;

  const { ticker } = parseSymbol(symbol);
  const identifiers = [symbol, ticker, yahooSymbol, yahooSymbol.split(".")[0]]
    .map(normalizeIdentifier)
    .filter(Boolean);
  const nameTerms = assetNameTerms(assetName);
  const filtered = news.filter((item) => isYahooNewsRelevant(item, identifiers, nameTerms));
  return filtered.length > 0 ? filtered : null;
}

function isYahooNewsRelevant(item: NewsItem, identifiers: string[], nameTerms: string[]): boolean {
  const relatedTickers = item.relatedTickers?.map(normalizeIdentifier).filter(Boolean) ?? [];
  if (relatedTickers.some((relatedTicker) =>
    identifiers.some((identifier) => relatedTicker === identifier || relatedTicker.includes(identifier))
  )) {
    return true;
  }

  const searchable = normalizeText(`${item.title} ${item.publisher}`);
  return nameTerms.some((term) => searchable.includes(term)) ||
    identifiers.some((identifier) => identifier.length >= 3 && searchable.includes(identifier.toLowerCase()));
}

function assetNameTerms(assetName: string | null | undefined): string[] {
  if (!assetName) return [];
  const stopWords = new Set([
    "adr",
    "class",
    "co",
    "company",
    "corp",
    "corporation",
    "group",
    "holding",
    "holdings",
    "inc",
    "limited",
    "ltd",
    "ordinary",
    "plc",
    "share",
    "shares",
    "stock",
  ]);
  return normalizeText(assetName)
    .split(" ")
    .filter((term) => term.length >= 3 && !stopWords.has(term));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeIdentifier(value: string): string {
  return value.toUpperCase().replace(/^[#$]/, "").replace(/[^A-Z0-9]/g, "");
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const body = await req.json() as FetchAssetNewsRequest;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      return json(await handleFetchAssetNews(body, { cache: createSupabaseCache(supabase) }));
    } catch (err) {
      console.error("fetch-asset-news error:", err);
      return json({ news: null });
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
