import { fetchYahooAssetInfo, handleFetchAssetInfo, type AssetInfo } from "../../../fetch-asset-info/index.ts";
import { fetchStockAnalysisInfo } from "../../../_shared/price-providers/stockanalysis.ts";
import { toYahooSymbol } from "../../../_shared/price-providers/yahoo.ts";
import { assert, assertDeepEquals, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW } from "../../_shared/fixtures.ts";

Deno.test("fetch-asset-info integrates StockAnalysis and Yahoo for AAPL", async () => {
  const stockAnalysisInfo = await fetchStockAnalysisInfo("AAPL", "stock");
  const yahooInfo = await fetchYahooAssetInfo(toYahooSymbol("AAPL"), "stock");
  assertHasProviderValue(stockAnalysisInfo, ["country", "sector", "description", "pe", "eps"]);
  assertHasProviderValue(yahooInfo, ["pe", "eps", "analystRating", "analystCount", "description"]);

  const result = await handleFetchAssetInfo(
    { symbol: "AAPL", asset_type: "stock" },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
    },
  );

  assertEquals(result.yahooUrl, "https://finance.yahoo.com/quote/AAPL/");
  assertDeepEquals(result.sources, ["StockAnalysis", "Yahoo"]);
  assertEquals("news" in result, false);
  assertUsesStockAnalysisPriority(result, stockAnalysisInfo);
});

Deno.test("fetch-asset-info integrates exchange-prefixed StockAnalysis and converted Yahoo symbols", async () => {
  const yahooSymbol = toYahooSymbol("HKG:1810");
  assertEquals(yahooSymbol, "1810.HK");

  const stockAnalysisInfo = await fetchStockAnalysisInfo("HKG:1810", "stock");
  const yahooInfo = await fetchYahooAssetInfo(yahooSymbol, "stock");
  assertHasProviderValue(stockAnalysisInfo, ["country", "sector", "description", "pe", "eps"]);
  assertHasProviderValue(yahooInfo, ["pe", "eps", "analystRating", "analystCount", "description"]);

  const result = await handleFetchAssetInfo(
    { symbol: "HKG:1810", asset_type: "stock" },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
    },
  );

  assertEquals(result.yahooUrl, "https://finance.yahoo.com/quote/1810.HK/");
  assertDeepEquals(result.sources, ["StockAnalysis", "Yahoo"]);
  assertEquals("news" in result, false);
  assertUsesStockAnalysisPriority(result, stockAnalysisInfo);
  assertUsesYahooFallback(result, stockAnalysisInfo, yahooInfo);
});

type AssetInfoKey = keyof Pick<
  AssetInfo,
  | "country"
  | "sector"
  | "industry"
  | "description"
  | "website"
  | "employees"
  | "marketCap"
  | "exchange"
  | "priceTarget"
  | "pe"
  | "eps"
  | "analystRating"
  | "analystCount"
>;

function assertHasProviderValue(info: Partial<AssetInfo>, keys: AssetInfoKey[]) {
  assert(
    keys.some((key) => {
      const value = info[key];
      return Array.isArray(value) ? value.length > 0 : value != null;
    }),
    `expected at least one live provider value among ${keys.join(", ")}`,
  );
}

function assertUsesStockAnalysisPriority(result: AssetInfo, stockAnalysisInfo: Partial<AssetInfo>) {
  for (const key of ["country", "sector", "description", "pe", "eps"] as AssetInfoKey[]) {
    const stockAnalysisValue = stockAnalysisInfo[key];
    if (stockAnalysisValue != null) {
      assertEquals(result[key], stockAnalysisValue);
      return;
    }
  }
  throw new Error("StockAnalysis did not return a priority field to verify");
}

function assertUsesYahooFallback(
  result: AssetInfo,
  stockAnalysisInfo: Partial<AssetInfo>,
  yahooInfo: Partial<AssetInfo>,
) {
  for (const key of ["analystRating", "analystCount", "pe", "eps", "description"] as AssetInfoKey[]) {
    const stockAnalysisValue = stockAnalysisInfo[key];
    const yahooValue = yahooInfo[key];
    if (stockAnalysisValue == null && yahooValue != null) {
      assertEquals(result[key], yahooValue);
      return;
    }
  }

  throw new Error("Yahoo did not return a live fallback field to verify");
}
