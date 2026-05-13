import { convertYahooCommodityHistory } from "../../../_shared/price-providers/yahoo.ts";
import { fetchPriceablePricesFlow } from "../../../fetch-prices/priceable_flow.ts";
import { handleFetchPrices } from "../../../fetch-prices/index.ts";
import { handleLookupSymbol, type LookupResult } from "../../../lookup-symbol/index.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW } from "../../_shared/fixtures.ts";

const GRAMS_PER_TROY_OUNCE = 31.1034768;

function assertClose(actual: number | null | undefined, expected: number, message: string) {
  assert(actual != null, message);
  const diff = Math.abs(actual - expected);
  if (diff > 0.000001) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}

Deno.test("commodity prices convert gold and silver Yahoo quotes to per gram", async () => {
  const result = await fetchPriceablePricesFlow(
    [
      { symbol: "GC=F", asset_type: "commodity", exchange: null, ticker: "GC=F" },
      { symbol: "SI=F", asset_type: "commodity", exchange: null, ticker: "SI=F" },
      { symbol: "CL=F", asset_type: "commodity", exchange: null, ticker: "CL=F" },
    ],
    undefined,
    {
      async fetchStockAnalysisQuote() {
        throw new Error("not used");
      },
      async fetchYahooQuotes() {
        return { "GC=F": 3000, "SI=F": 30, "CL=F": 70 };
      },
      async fetchFinnhubQuotes() {
        return {};
      },
    },
  );

  assertClose(result.prices["GC=F"], 3000 / GRAMS_PER_TROY_OUNCE, "gold should be per gram");
  assertClose(result.prices["SI=F"], 30 / GRAMS_PER_TROY_OUNCE, "silver should be per gram");
  assertEquals(result.prices["CL=F"], 70);
});

Deno.test("commodity history converts gold and silver Yahoo points to per gram", () => {
  const gold = convertYahooCommodityHistory("GC=F", [{ date: "2026-05-08", price: 3000 }]);
  const silver = convertYahooCommodityHistory("SI=F", [{ date: "2026-05-08", price: 30 }]);
  const oil = convertYahooCommodityHistory("CL=F", [{ date: "2026-05-08", price: 70 }]);

  assertClose(gold[0].price, 3000 / GRAMS_PER_TROY_OUNCE, "gold history should be per gram");
  assertClose(silver[0].price, 30 / GRAMS_PER_TROY_OUNCE, "silver history should be per gram");
  assertEquals(oil[0].price, 70);
});

Deno.test("fetch-prices ignores stale ounce cache keys for gram-priced metals", async () => {
  const cache = new InMemoryCache<{ price: number; currency?: string }>([
    {
      cache_key: "price:GC=F",
      response: { price: 3000 },
      expires_at: new Date(FIXED_NOW + 60_000).toISOString(),
    },
  ]);

  const result = await handleFetchPrices(
    { items: [{ symbol: "GC=F", asset_type: "commodity" }] },
    {
      cache,
      now: () => FIXED_NOW,
      priceableProviders: {
        async fetchStockAnalysisQuote() {
          throw new Error("not used");
        },
        async fetchYahooQuotes() {
          return { "GC=F": 3000 };
        },
        async fetchFinnhubQuotes() {
          return {};
        },
      },
    },
  );

  assertClose(result.prices["GC=F"], 3000 / GRAMS_PER_TROY_OUNCE, "gold should ignore old ounce cache");
  assert(cache.rows.has("price:GC=F:g-v1"), "gold should write a gram-specific cache key");
});

Deno.test("lookup-symbol converts metal prices and ignores stale ounce cache keys", async () => {
  const cache = new InMemoryCache<LookupResult>([
    {
      cache_key: "lookup:GC=F",
      response: { name: "Gold", price: 3000, currency: "USD", description: null, logoUrl: null },
      expires_at: new Date(FIXED_NOW + 60_000).toISOString(),
    },
  ]);

  const result = await handleLookupSymbol(
    { symbol: "GC=F", asset_type: "commodity" },
    {
      cache,
      now: () => FIXED_NOW,
      providers: {
        async fetchYahooSummary() {
          return { name: "Gold", price: 3000, currency: "USD" };
        },
      },
    },
  );

  assertClose(result.price, 3000 / GRAMS_PER_TROY_OUNCE, "lookup gold should be per gram");
  assert(cache.rows.has("lookup:GC=F:g-v1"), "lookup should write a gram-specific cache key");
});
