import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type CorporateActions,
  fetchYahooCorporateActions as defaultFetchYahooCorporateActions,
  toYahooSymbol,
} from "../_shared/price-providers/yahoo.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CORPORATE_ACTIONS_TTL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_TYPES = new Set(["stock", "etf", "bond", "mutual_fund", "commodity"]);

export interface FetchCorporateActionsRequest {
  symbol: string;
  asset_type: string;
  from_date?: string;
}

export interface CacheRow {
  cache_key: string;
  response: CorporateActions;
  expires_at: string | null;
}

export interface CacheUpsert {
  cache_key: string;
  response: CorporateActions;
  updated_at: string;
  expires_at: string;
}

export interface EdgeCache {
  getMany: (cacheKeys: string[]) => Promise<CacheRow[]>;
  upsert: (row: CacheUpsert) => Promise<void>;
}

export interface FetchCorporateActionsDeps {
  cache: EdgeCache;
  now?: () => number;
  fetchCorporateActions?: typeof defaultFetchYahooCorporateActions;
}

const EMPTY: CorporateActions = { dividends: [], splits: [] };

export async function handleFetchCorporateActions(
  payload: FetchCorporateActionsRequest,
  deps: FetchCorporateActionsDeps,
): Promise<CorporateActions> {
  const sym = payload.symbol?.toUpperCase().trim();
  const assetType = payload.asset_type;
  if (!sym || !SUPPORTED_TYPES.has(assetType)) return { ...EMPTY };

  const now = deps.now?.() ?? Date.now();
  const cacheKey = `corporate-actions:v1:${sym}`;
  const cached = await deps.cache.getMany([cacheKey]);
  const row = cached.find((r) => r.cache_key === cacheKey);
  const fresh = Boolean(row?.expires_at && new Date(row.expires_at).getTime() > now);

  let actions: CorporateActions;
  if (fresh) {
    actions = row!.response;
  } else {
    const fetchFn = deps.fetchCorporateActions ?? defaultFetchYahooCorporateActions;
    actions = await fetchFn(toYahooSymbol(sym), 0, Math.floor(now / 1000));
    await deps.cache.upsert({
      cache_key: cacheKey,
      response: actions,
      updated_at: new Date(now).toISOString(),
      expires_at: new Date(now + CORPORATE_ACTIONS_TTL_MS).toISOString(),
    });
  }

  const from = payload.from_date;
  if (!from) return actions;
  return {
    dividends: actions.dividends.filter((d) => d.date >= from),
    splits: actions.splits.filter((s) => s.date >= from),
  };
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const body = await req.json() as FetchCorporateActionsRequest;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      return json(await handleFetchCorporateActions(body, { cache: createSupabaseCache(supabase) }));
    } catch (err) {
      console.error("fetch-corporate-actions error:", err);
      return json({ ...EMPTY });
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
