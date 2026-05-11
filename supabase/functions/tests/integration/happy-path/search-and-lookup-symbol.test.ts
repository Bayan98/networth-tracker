import { handleLookupSymbol, type LookupResult } from "../../../lookup-symbol/index.ts";
import { handleSearchSymbols } from "../../../search-symbols/index.ts";
import { assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW } from "../../_shared/fixtures.ts";

Deno.test("search-symbols keeps bare and USD crypto symbols, then displays bare tickers", async () => {
  const search = await handleSearchSymbols(
    { query: "crypto", asset_type: "crypto" },
    {
      async searchStockAnalysis() {
        return [
          { symbol: "BTC", name: "Bitcoin", exchange: "CCC", type: "Cryptocurrency" },
          { symbol: "ETH-EUR", name: "Ethereum EUR", exchange: "CCC", type: "Cryptocurrency" },
        ];
      },
      async searchYahoo() {
        return [
          { symbol: "BTC-USD", name: "Bitcoin USD", exchange: "CCC", type: "Cryptocurrency" },
          { symbol: "BTC-EUR", name: "Bitcoin EUR", exchange: "CCC", type: "Cryptocurrency" },
          { symbol: "ETH-USD", name: "Ethereum USD", exchange: "CCC", type: "Cryptocurrency" },
          { symbol: "SOL", name: "Solana", exchange: "CCC", type: "Cryptocurrency" },
        ];
      },
    },
  );

  assertEquals(search.results.map((result) => result.symbol).join(","), "BTC,ETH,SOL");
  assertEquals(search.results.some((result) => result.symbol.endsWith("-USD")), false);
  assertEquals(search.results.some((result) => result.symbol.endsWith("-EUR")), false);
  assertEquals(search.results.some((result) => result.exchange !== undefined), false);
});

Deno.test("search-symbols and lookup-symbol happy path use the Yahoo USD crypto pair", async () => {
  const search = await handleSearchSymbols(
    { query: "BTC", asset_type: "crypto" },
    {
      async searchStockAnalysis() {
        return [{ symbol: "BTC", name: "Bitcoin", exchange: "CCC", type: "Cryptocurrency" }];
      },
      async searchYahoo() {
        return [
          { symbol: "BTC-USD", name: "Bitcoin USD", exchange: "CCC", type: "Cryptocurrency" },
          { symbol: "BTC-EUR", name: "Bitcoin EUR", exchange: "CCC", type: "Cryptocurrency" },
        ];
      },
    },
  );

  assertEquals(search.results.length, 1);
  assertEquals(search.results[0].symbol, "BTC");
  assertEquals(search.results[0].exchange, undefined);

  const cache = new InMemoryCache<LookupResult>();
  const lookup = await handleLookupSymbol(
    { symbol: search.results[0].symbol, asset_type: "crypto" },
    {
      cache,
      now: () => FIXED_NOW,
      providers: {
        async fetchYahooSummary(symbol) {
          assertEquals(symbol, "BTC-USD");
          return {
            name: "Bitcoin",
            price: 100000,
            currency: "USD",
            description: "Bitcoin description",
            logoUrl: "https://example.com/btc.png",
          };
        },
        async fetchCoinGeckoCoin() {
          throw new Error("CoinGecko should not be used when Yahoo returns a complete result");
        },
      },
    },
  );

  assertEquals(lookup.name, "Bitcoin");
  assertEquals(lookup.price, 100000);
  assertEquals(lookup.currency, "USD");
  assertEquals(cache.upsertCalls, 1);
});
