import { YAHOO_HEADERS } from "./constants.ts";

export async function fetchYahooPriceNearDate(
  symbol: string,
  dateEpoch: number,
  period1: number,
  period2: number,
  isToday: boolean,
): Promise<number | null> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = await res.json() as {
      chart: {
        result?:
          | Array<{
            meta?: { regularMarketPrice?: number };
            timestamp?: number[];
            indicators?: { quote: Array<{ close: (number | null)[] }> };
          }>
          | null;
      };
    };
    const result = data.chart?.result?.[0];
    if (isToday) return result?.meta?.regularMarketPrice ?? null;

    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    let price: number | null = null;
    let minDiff = Infinity;
    for (let i = 0; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - dateEpoch);
      if (closes[i] != null && diff < minDiff) {
        minDiff = diff;
        price = closes[i];
      }
    }
    return price;
  } catch (e) {
    console.error(`Yahoo Finance price-at-date error for ${symbol}:`, e);
    return null;
  }
}
