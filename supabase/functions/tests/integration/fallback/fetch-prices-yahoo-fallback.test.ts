import { handleFetchPrices } from "../../../fetch-prices/index.ts";
import { fetchFinnhubQuotes } from "../../../_shared/price-providers/finnhub.ts";
import { fetchYahooQuotes } from "../../../_shared/price-providers/yahoo.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW, TEST_ITEMS } from "../../_shared/fixtures.ts";

Deno.test("fetch-prices-yahoo-fallback uses Yahoo when StockAnalysis fails for AAPL", async () => {
  const calls = { stockAnalysis: 0, yahoo: 0, finnhub: 0 };
  const result = await handleFetchPrices(
    { items: TEST_ITEMS.filter((item) => item.symbol === "AAPL") },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
      finnhubToken: "test-token",
      priceableProviders: {
        async fetchStockAnalysisQuote() {
          calls.stockAnalysis++;
          throw new Error("StockAnalysis unavailable");
        },
        async fetchYahooQuotes(symbols) {
          calls.yahoo++;
          return await fetchYahooQuotes(symbols);
        },
        async fetchFinnhubQuotes(symbols, token) {
          calls.finnhub++;
          return await fetchFinnhubQuotes(symbols, token);
        },
      },
    },
  );

  assert((result.prices.AAPL ?? 0) > 0, "Yahoo fallback should return a live AAPL price");
  assertEquals(calls.stockAnalysis, 1);
  assertEquals(calls.yahoo, 1);
  assertEquals(calls.finnhub, 0);
});
