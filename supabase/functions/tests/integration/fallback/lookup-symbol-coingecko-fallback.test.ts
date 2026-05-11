import { handleLookupSymbol, type LookupResult } from "../../../lookup-symbol/index.ts";
import { handleSearchSymbols } from "../../../search-symbols/index.ts";
import { assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW } from "../../_shared/fixtures.ts";

Deno.test("lookup-symbol falls back to CoinGecko for crypto when Yahoo has no data", async () => {
  const search = await handleSearchSymbols(
    { query: "BTC", asset_type: "crypto" },
    {
      async searchStockAnalysis() {
        return [];
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

  const calls = { yahoo: 0, coingecko: 0 };
  const lookup = await handleLookupSymbol(
    { symbol: search.results[0].symbol, asset_type: "crypto" },
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
          return {
            name: "Bitcoin",
            market_data: { current_price: { usd: 99000 } },
            image: { small: "https://example.com/btc.png" },
            description: { en: "<p>Peer-to-peer digital money.</p>" },
          };
        },
      },
    },
  );

  assertEquals(calls.yahoo, 1);
  assertEquals(calls.coingecko, 1);
  assertEquals(lookup.name, "Bitcoin");
  assertEquals(lookup.price, 99000);
  assertEquals(lookup.currency, "USD");
  assertEquals(lookup.description, "Peer-to-peer digital money.");
});
