import { handleFetchPrices } from "../../../fetch-prices/index.ts";
import { assert, assertCanonicalDeepEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW, TEST_ITEMS } from "../../_shared/fixtures.ts";

Deno.test("fetch-prices writes cache and reuses it on repeated requests", async () => {
  const cache = new InMemoryCache();
  const deps = {
    cache,
    now: () => FIXED_NOW,
  };

  const first = await handleFetchPrices({ items: TEST_ITEMS }, deps);
  assert(cache.upsertCalls > 0, "first request should write cache rows");
  const writesAfterFirst = cache.upsertCalls;
  const second = await handleFetchPrices({ items: TEST_ITEMS }, deps);

  assertCanonicalDeepEquals(second, first);
  assert(cache.upsertCalls === writesAfterFirst, "second request should not write cache rows");
});
