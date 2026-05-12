import { handleLookupSymbol, type LookupResult } from "../../../lookup-symbol/index.ts";
import { handleSearchSymbols } from "../../../search-symbols/index.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW } from "../../_shared/fixtures.ts";

Deno.test("search-symbols integrates live StockAnalysis and Yahoo crypto results", async () => {
  const search = await handleSearchSymbols({ query: "BTC", asset_type: "crypto" });

  assert(search.results.length > 0, "search-symbols should return live BTC crypto results");
  assertEquals(search.results[0].symbol, "BTC");
  assertEquals(search.results.some((result) => result.symbol.endsWith("-USD")), false);
  assertEquals(search.results.some((result) => result.symbol.endsWith("-EUR")), false);
  assertEquals(search.results.some((result) => result.exchange !== undefined), false);
});

Deno.test("search-symbols and lookup-symbol integrate live providers for BTC", async () => {
  const search = await handleSearchSymbols({ query: "BTC", asset_type: "crypto" });

  assert(search.results.length > 0, "search-symbols should return live BTC crypto results");
  assertEquals(search.results[0].symbol, "BTC");

  const cache = new InMemoryCache<LookupResult>();
  const lookup = await handleLookupSymbol(
    { symbol: search.results[0].symbol, asset_type: "crypto" },
    {
      cache,
      now: () => FIXED_NOW,
    },
  );

  assert(lookup.name != null, "lookup-symbol should return a live BTC name");
  if ((lookup.price ?? 0) <= 0) {
    console.warn("BTC lookup providers returned no live price");
  }
  if (lookup.currency != null) assertEquals(lookup.currency, "USD");
  assertEquals(cache.upsertCalls, 1);
});
