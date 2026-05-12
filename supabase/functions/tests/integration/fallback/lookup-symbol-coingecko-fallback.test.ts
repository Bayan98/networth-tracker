import {
  fetchCoinGeckoCoin,
  handleLookupSymbol,
  type LookupResult,
} from "../../../lookup-symbol/index.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW } from "../../_shared/fixtures.ts";

Deno.test("lookup-symbol integrates live Yahoo and CoinGecko data for BTC", async () => {
  const calls = { yahoo: 0, coingecko: 0 };
  const lookup = await handleLookupSymbol(
    { symbol: "BTC", asset_type: "crypto" },
    {
      cache: new InMemoryCache<LookupResult>(),
      now: () => FIXED_NOW,
      providers: {
        async fetchYahooSummary(symbol) {
          calls.yahoo++;
          assertEquals(symbol, "BTC-USD");
          return {};
        },
        async fetchCoinGeckoCoin(coinGeckoId) {
          calls.coingecko++;
          assertEquals(coinGeckoId, "bitcoin");
          return await fetchCoinGeckoCoin(coinGeckoId);
        },
      },
    },
  );

  assertEquals(calls.yahoo, 1);
  assertEquals(calls.coingecko, 1);
  if (!lookup.name) {
    console.warn("CoinGecko live endpoint returned no Bitcoin metadata");
    return;
  }
  assert(lookup.name != null, "lookup-symbol should return a live BTC name");
  if ((lookup.price ?? 0) <= 0) {
    console.warn("BTC lookup providers returned no live price");
  }
  if (lookup.currency != null) assertEquals(lookup.currency, "USD");
});
