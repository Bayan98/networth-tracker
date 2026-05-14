import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  coinGeckoIdForSymbol,
  fetchCoinGeckoCoin,
  searchCoinGeckoName,
  type CoinGeckoCoin,
} from "../_shared/price-providers/coingecko/index.ts";
import { fetchFinnhubProfileName, fetchFinnhubQuotes } from "../_shared/price-providers/finnhub/index.ts";
import { fetchStockAnalysisQuote, parseSymbol } from "../_shared/price-providers/stockanalysis/index.ts";
import {
  convertYahooCommodityPrice,
  fetchYahooSummary,
  findYahooSymbol,
  perGramCommodityCacheSuffix,
} from "../_shared/price-providers/yahoo/index.ts";

export { fetchCoinGeckoCoin };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICEABLE = ["stock", "etf", "bond", "mutual_fund", "commodity", "crypto"];
const TTL_MS = 60 * 60 * 1000;

function cacheKeyFor(sym: string, assetType: string): string {
  const suffix = assetType === "commodity" ? perGramCommodityCacheSuffix(sym) : "";
  return `lookup:${sym}${suffix}`;
}

export interface LookupResult {
  name: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
  logoUrl: string | null;
}

export interface LookupSymbolRequest {
  symbol: string;
  asset_type: string;
}

export interface LookupCacheRow {
  cache_key: string;
  response: LookupResult;
  expires_at: string | null;
}

export interface LookupCacheUpsert {
  cache_key: string;
  response: LookupResult;
  updated_at: string;
  expires_at: string;
}

export interface LookupCache {
  getMany: (cacheKeys: string[]) => Promise<LookupCacheRow[]>;
  upsert: (row: LookupCacheUpsert) => Promise<void>;
}

export interface LookupProviders {
  fetchYahooSummary?: (yahooSym: string) => Promise<Partial<LookupResult>>;
  fetchCoinGeckoCoin?: (coinGeckoId: string) => Promise<CoinGeckoCoin | null>;
  searchCoinGeckoName?: (ticker: string) => Promise<string | null>;
  fetchStockAnalysisQuote?: typeof fetchStockAnalysisQuote;
  findYahooSymbol?: (ticker: string) => Promise<string | null>;
  fetchFinnhubQuotes?: typeof fetchFinnhubQuotes;
  fetchFinnhubProfileName?: typeof fetchFinnhubProfileName;
  finnhubToken?: string;
}

export interface LookupDeps {
  cache: LookupCache;
  providers?: LookupProviders;
  now?: () => number;
}

export async function handleLookupSymbol(
  payload: LookupSymbolRequest,
  deps: LookupDeps,
): Promise<LookupResult> {
  const sym = payload.symbol.toUpperCase().trim();
  const assetType = payload.asset_type;
  if (!sym || !assetType || !PRICEABLE.includes(assetType)) {
    return { name: null, price: null, currency: null, description: null, logoUrl: null };
  }

  const now = deps.now?.() ?? Date.now();
  const cacheKey = cacheKeyFor(sym, assetType);
  const cached = await deps.cache.getMany([cacheKey]);
  const cachedRow = cached[0];

  if (cachedRow?.expires_at && new Date(cachedRow.expires_at).getTime() > now) {
    return cachedRow.response;
  }

  const providers = deps.providers ?? {};
  const yahooSummary = providers.fetchYahooSummary ?? fetchYahooSummary;
  const coinGeckoCoin = providers.fetchCoinGeckoCoin ?? fetchCoinGeckoCoin;
  const coinGeckoName = providers.searchCoinGeckoName ?? searchCoinGeckoName;
  const stockAnalysisQuote = providers.fetchStockAnalysisQuote ?? fetchStockAnalysisQuote;
  const yahooSymbolFinder = providers.findYahooSymbol ?? findYahooSymbol;
  const finnhubQuotes = providers.fetchFinnhubQuotes ?? fetchFinnhubQuotes;
  const finnhubProfileName = providers.fetchFinnhubProfileName ?? fetchFinnhubProfileName;

  let result: LookupResult = { name: null, price: null, currency: null, description: null, logoUrl: null };
  const { exchange, ticker } = parseSymbol(sym);

  if (assetType === "crypto") {
    const yahooResult = await yahooSummary(`${ticker}-USD`);
    if (yahooResult.name || yahooResult.price != null) {
      result = { ...result, ...yahooResult };
      if (!result.currency) result.currency = "USD";
    }

    if (!result.name || result.price == null) {
      const data = await coinGeckoCoin(coinGeckoIdForSymbol(ticker));
      if (data) {
        if (!result.name && data.name) result.name = data.name;
        if (result.price == null) result.price = data.market_data?.current_price?.usd ?? null;
        if (!result.logoUrl && data.image?.small) result.logoUrl = data.image.small;
        if (!result.description && data.description?.en) {
          result.description = data.description.en.replace(/<[^>]*>/g, "").slice(0, 500) || null;
        }
        if (!result.currency) result.currency = "USD";
      }

      if (!result.name) {
        result.name = await coinGeckoName(ticker);
      }
    }
  } else if (assetType === "commodity") {
    const yahooResult = await yahooSummary(sym);
    if (yahooResult.name) result.name = yahooResult.name;
    if (yahooResult.price != null) result.price = convertYahooCommodityPrice(sym, yahooResult.price);
    if (yahooResult.currency) result.currency = yahooResult.currency;
    if (yahooResult.description) result.description = yahooResult.description;
    if (yahooResult.logoUrl) result.logoUrl = yahooResult.logoUrl;
  } else {
    const [saResult, yahooResult] = await Promise.all([
      stockAnalysisQuote(sym, assetType),
      yahooSummary(exchange ? ticker : sym),
    ]);

    if (saResult.name) result.name = saResult.name;
    if (saResult.price != null) result.price = saResult.price;
    if (saResult.currency) result.currency = saResult.currency;
    if (saResult.description) result.description = saResult.description;

    if (!result.name && yahooResult.name) result.name = yahooResult.name;
    if (result.price == null && yahooResult.price != null) result.price = yahooResult.price;
    if (!result.currency && yahooResult.currency) result.currency = yahooResult.currency;
    if (!result.description && yahooResult.description) result.description = yahooResult.description;
    if (!result.logoUrl && yahooResult.logoUrl) result.logoUrl = yahooResult.logoUrl;

    if (result.price == null && exchange) {
      const altSym = await yahooSymbolFinder(ticker);
      if (altSym && altSym !== ticker) {
        const altYahoo = await yahooSummary(altSym);
        if (altYahoo.price != null) result.price = altYahoo.price;
        if (!result.name && altYahoo.name) result.name = altYahoo.name;
        if (!result.currency && altYahoo.currency) result.currency = altYahoo.currency;
        if (!result.logoUrl && altYahoo.logoUrl) result.logoUrl = altYahoo.logoUrl;
      }
    }

    if (result.price == null && !exchange) {
      const token = providers.finnhubToken ?? Deno.env.get("FINNHUB_API_KEY");
      if (token) {
        const [name, prices] = await Promise.all([
          finnhubProfileName(sym, token),
          finnhubQuotes([sym], token),
        ]);
        if (!result.name && name) result.name = name;
        if (result.price == null && prices[sym] != null) result.price = prices[sym];
      }
    }
  }

  await deps.cache.upsert({
    cache_key: cacheKey,
    response: result,
    updated_at: new Date(now).toISOString(),
    expires_at: new Date(now + TTL_MS).toISOString(),
  });

  return result;
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      return json(await handleLookupSymbol(await req.json() as LookupSymbolRequest, {
        cache: createSupabaseCache(supabase),
      }));
    } catch (err) {
      console.error("lookup-symbol error:", err);
      return json({ name: null, price: null, currency: null, description: null, logoUrl: null });
    }
  });
}

// deno-lint-ignore no-explicit-any
function createSupabaseCache(supabase: any): LookupCache {
  return {
    async getMany(cacheKeys) {
      const { data, error } = await supabase
        .from("api_cache")
        .select("cache_key, response, expires_at")
        .in("cache_key", cacheKeys);
      if (error) throw error;
      return (data ?? []) as LookupCacheRow[];
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
