import {
  fetchStockAnalysisHistory,
  fetchStockAnalysisQuote,
} from "../_shared/price-providers/stockanalysis.ts";
import { fetchYahooPriceNearDate, toYahooSymbol } from "../_shared/price-providers/yahoo.ts";

export async function fetchPriceablePriceAtDateFlow(
  symbol: string,
  assetType: string,
  dateEpoch: number,
  period1: number,
  period2: number,
  isToday: boolean,
): Promise<number | null> {
  let price: number | null = null;

  if (isToday) {
    const saResult = await fetchStockAnalysisQuote(symbol, assetType);
    if (saResult.price != null) price = saResult.price;
  } else {
    const saPoints = await fetchStockAnalysisHistory(symbol, assetType, period1, period2);
    if (saPoints.length > 0) {
      let minDiff = Infinity;
      for (const p of saPoints) {
        const ts = new Date(p.date + "T12:00:00Z").getTime() / 1000;
        const diff = Math.abs(ts - dateEpoch);
        if (diff < minDiff) {
          minDiff = diff;
          price = p.price;
        }
      }
    }
  }

  if (price != null) return price;

  return fetchYahooPriceNearDate(toYahooSymbol(symbol), dateEpoch, period1, period2, isToday);
}
