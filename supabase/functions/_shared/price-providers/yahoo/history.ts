import { YAHOO_HEADERS } from "./constants.ts";
import type { PricePoint } from "./types.ts";

export async function fetchYahooCloseHistory(
  symbol: string,
  fromTs: number,
  toTs: number,
): Promise<PricePoint[]> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${fromTs}&period2=${toTs}&events=div%2Csplits&includeAdjustedClose=true`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
      return [];
    }

    const data = await res.json() as {
      chart: {
        result:
          | Array<{
            timestamp?: number[];
            indicators?: { quote: Array<{ close: (number | null)[] }> };
          }>
          | null;
      };
    };
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!timestamps || !closes) return [];

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        price: closes[i],
      }))
      .filter((point): point is PricePoint => point.price != null && point.price > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.error(`Yahoo Finance history error for ${symbol}:`, e);
    return [];
  }
}
