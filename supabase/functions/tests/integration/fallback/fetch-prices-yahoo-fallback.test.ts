import { handleFetchPrices } from "../../../fetch-prices/index.ts";
import { fetchYahooQuotes, toYahooSymbol } from "../../../_shared/price-providers/yahoo.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW, TEST_ITEMS } from "../../_shared/fixtures.ts";

Deno.test("fetch-prices-yahoo-fallback uses live Yahoo when StockAnalysis fails for AAPL", async () => {
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
        async fetchFinnhubQuotes() {
          calls.finnhub++;
          return {};
        },
      },
    },
  );

  assert((result.prices.AAPL ?? 0) > 0, "Yahoo fallback should return a live AAPL price");
  assertEquals(calls.stockAnalysis, 1);
  assertEquals(calls.yahoo, 1);
  assertEquals(calls.finnhub, 0);
});

Deno.test("fetch-prices-yahoo-fallback converts exchange-prefixed symbols for live Yahoo", async () => {
  const calls = { stockAnalysis: 0, yahoo: 0, finnhub: 0 };
  const yahooSymbol = toYahooSymbol("HKG:1810");
  assertEquals(yahooSymbol, "1810.HK");

  const result = await handleFetchPrices(
    { items: TEST_ITEMS.filter((item) => item.symbol === "HKG:1810") },
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
          assertEquals(symbols.length, 1);
          assertEquals(symbols[0], yahooSymbol);
          return await fetchYahooQuotes(symbols);
        },
        async fetchFinnhubQuotes() {
          calls.finnhub++;
          return {};
        },
      },
    },
  );

  assert((result.prices["HKG:1810"] ?? 0) > 0, "Yahoo fallback should return a live HKG:1810 price");
  assertEquals(calls.stockAnalysis, 1);
  assertEquals(calls.yahoo, 1);
  assertEquals(calls.finnhub, 0);
});
