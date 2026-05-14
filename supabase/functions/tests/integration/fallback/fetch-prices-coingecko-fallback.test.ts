import { handleFetchPrices } from "../../../fetch-prices/index.ts";
import { fetchCoinGeckoSimplePrices } from "../../../_shared/price-providers/coingecko/index.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW, TEST_ITEMS } from "../../_shared/fixtures.ts";

Deno.test("fetch-prices-coingecko-fallback uses CoinGecko when Yahoo fails for BTC", async () => {
  const calls = { yahoo: 0, coingecko: 0 };
  let coingeckoReturnedPrice = false;
  const result = await handleFetchPrices(
    { items: TEST_ITEMS.filter((item) => item.symbol === "BTC") },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
      cryptoProviders: {
        async fetchYahooQuotes() {
          calls.yahoo++;
          throw new Error("Yahoo unavailable");
        },
        async fetchCoinGeckoSimplePrices(symbols) {
          calls.coingecko++;
          const prices = await fetchCoinGeckoSimplePrices(symbols);
          coingeckoReturnedPrice = (prices.BTC ?? 0) > 0;
          return prices;
        },
      },
    },
  );

  assertEquals(calls.yahoo, 1);
  assertEquals(calls.coingecko, 1);
  if (!coingeckoReturnedPrice) {
    console.warn(
      "CoinGecko live endpoint returned no BTC price; fallback path was still exercised",
    );
    return;
  }
  assert(
    (result.prices.BTC ?? 0) > 0,
    "CoinGecko fallback should return a live BTC price",
  );
});
