import { fetchCoinGeckoMarketChart } from "../_shared/price-providers/coingecko/index.ts";
import { fetchYahooCloseHistory, type PricePoint } from "../_shared/price-providers/yahoo/index.ts";

export interface CryptoHistoryItem {
  symbol: string;
  cgId: string;
}

export interface CryptoHistoryResult {
  symbol: string;
  points: PricePoint[];
}

export async function fetchCryptoHistoryFlow(
  items: CryptoHistoryItem[],
  days: number,
  fromTs: number,
  toTs: number,
): Promise<CryptoHistoryResult[]> {
  const results: CryptoHistoryResult[] = [];
  for (const { symbol, cgId } of items) {
    let points = await fetchCoinGeckoMarketChart(cgId, days);

    if (points.length === 0) {
      const yahooSym = `${symbol}-USD`;
      points = await fetchYahooCloseHistory(yahooSym, fromTs, toTs);
    }

    if (points.length > 0) results.push({ symbol, points });
  }
  return results;
}
