import { handleFetchPrices } from "../../../fetch-prices/index.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW, TEST_ITEMS } from "../../_shared/fixtures.ts";

Deno.test("fetch-prices happy path returns current prices and currencies", async () => {
  const cache = new InMemoryCache();
  const result = await handleFetchPrices(
    { items: TEST_ITEMS },
    {
      cache,
      now: () => FIXED_NOW,
    },
  );

  for (const item of TEST_ITEMS) {
    const symbol = item.symbol.toUpperCase();
    assert((result.prices[symbol] ?? 0) > 0, `${symbol} should have a positive price`);
  }

  assertEquals(result.currencies?.["KASE:HSBK"], "KZT");
  assertEquals(result.currencies?.["HKG:1810"], "HKD");
  assert(result.currencies?.AAPL != null, "AAPL should include a source currency");
  assertEquals(result.currencies?.BTC, undefined);
});
