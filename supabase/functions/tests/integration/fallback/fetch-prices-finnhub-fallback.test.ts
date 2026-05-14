import { handleFetchPrices } from "../../../fetch-prices/index.ts";
import { fetchFinnhubQuotes } from "../../../_shared/price-providers/finnhub/index.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW, TEST_ITEMS } from "../../_shared/fixtures.ts";

Deno.test({
  name:
    "fetch-prices-finnhub-fallback uses Finnhub when StockAnalysis and Yahoo fail for AAPL",
  async fn() {
    const calls = { stockAnalysis: 0, yahoo: 0, finnhub: 0 };
    const finnhubToken = Deno.env.get("FINNHUB_API_KEY") ?? undefined;
    const result = await handleFetchPrices(
      { items: TEST_ITEMS.filter((item) => item.symbol === "AAPL") },
      {
        cache: new InMemoryCache(),
        now: () => FIXED_NOW,
        finnhubToken,
        priceableProviders: {
          async fetchStockAnalysisQuote() {
            calls.stockAnalysis++;
            throw new Error("StockAnalysis unavailable");
          },
          async fetchYahooQuotes() {
            calls.yahoo++;
            throw new Error("Yahoo unavailable");
          },
          async fetchFinnhubQuotes(symbols, token) {
            calls.finnhub++;
            return await fetchFinnhubQuotes(symbols, token);
          },
        },
      },
    );

    assert(finnhubToken, "FINNHUB_API_KEY is required to verify the real Finnhub fallback");
    assert(
      (result.prices.AAPL ?? 0) > 0,
      "Finnhub fallback should return a live AAPL price",
    );
    assertEquals(calls.stockAnalysis, 1);
    assertEquals(calls.yahoo, 1);
    assertEquals(calls.finnhub, 1);
  },
});
