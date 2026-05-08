export interface PricePoint {
  date: string;
  price: number;
}

const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0", "Accept": "application/json" };

export async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) return {};
    const data = await res.json() as {
      quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice?: number }> };
    };
    const result: Record<string, number> = {};
    for (const q of data?.quoteResponse?.result ?? []) {
      if (q.regularMarketPrice != null && q.regularMarketPrice > 0) {
        result[q.symbol] = q.regularMarketPrice;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function fetchYahooCloseHistory(
  symbol: string,
  fromTs: number,
  toTs: number,
): Promise<PricePoint[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${fromTs}&period2=${toTs}&events=div%2Csplits&includeAdjustedClose=true`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) return [];

    const data = await res.json() as {
      chart: { result: Array<{ timestamp?: number[]; indicators?: { quote: Array<{ close: (number | null)[] }> } }> | null };
    };
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!timestamps || !closes) return [];

    return timestamps
      .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), price: closes[i] }))
      .filter((p): p is PricePoint => p.price != null && p.price > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.error(`Yahoo Finance history error for ${symbol}:`, e);
    return [];
  }
}

export async function fetchYahooPriceNearDate(
  symbol: string,
  dateEpoch: number,
  period1: number,
  period2: number,
  isToday: boolean,
): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) return null;
    const data = await res.json() as {
      chart: {
        result?: Array<{
          meta?: { regularMarketPrice?: number };
          timestamp?: number[];
          indicators?: { quote: Array<{ close: (number | null)[] }> };
        }> | null;
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
