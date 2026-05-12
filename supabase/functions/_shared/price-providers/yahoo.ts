export interface PricePoint {
  date: string;
  price: number;
}

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "application/json",
};

const YAHOO_EXCHANGE_SUFFIXES: Record<string, string> = {
  HKG: "HK",
  LSE: "L",
};

const TROY_OUNCES_PER_KILOGRAM = 32.15074656862798;
const PER_KG_COMMODITY_SYMBOLS = new Set(["GC=F", "SI=F"]);

export function toYahooSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase().trim();
  const separator = normalized.indexOf(":");
  if (separator < 0) return normalized;

  const exchange = normalized.slice(0, separator);
  const ticker = normalized.slice(separator + 1);
  const suffix = YAHOO_EXCHANGE_SUFFIXES[exchange];
  return suffix ? `${ticker}.${suffix}` : ticker;
}

export function convertYahooCommodityPrice(symbol: string, price: number): number {
  return PER_KG_COMMODITY_SYMBOLS.has(symbol.toUpperCase().trim())
    ? price * TROY_OUNCES_PER_KILOGRAM
    : price;
}

export function convertYahooCommodityHistory(symbol: string, points: PricePoint[]): PricePoint[] {
  if (!PER_KG_COMMODITY_SYMBOLS.has(symbol.toUpperCase().trim())) return points;
  return points.map((point) => ({
    ...point,
    price: point.price * TROY_OUNCES_PER_KILOGRAM,
  }));
}

export async function fetchYahooQuotes(
  symbols: string[],
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const result: Record<string, number> = {};
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${
    symbols.join(",")
  }`;
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
    } else {
      const data = await res.json() as {
        quoteResponse?: {
          result?: Array<{ symbol: string; regularMarketPrice?: number }>;
        };
      };
      for (const q of data?.quoteResponse?.result ?? []) {
        if (q.regularMarketPrice != null && q.regularMarketPrice > 0) {
          result[q.symbol] = q.regularMarketPrice;
        }
      }
    }
  } catch {
    // Continue to the chart endpoint below. Yahoo's quote endpoint can reject
    // requests while chart remains available.
  }

  await Promise.all(symbols.map(async (symbol) => {
    if (result[symbol] != null) return;
    const price = await fetchYahooChartQuote(symbol);
    if (price != null && price > 0) result[symbol] = price;
  }));

  return result;
}

async function fetchYahooChartQuote(symbol: string): Promise<number | null> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = await res.json() as {
      chart?: {
        result?:
          | Array<{
            meta?: { regularMarketPrice?: number };
            indicators?: { quote?: Array<{ close?: Array<number | null> }> };
          }>
          | null;
      };
    };
    const chart = data.chart?.result?.[0];
    const metaPrice = chart?.meta?.regularMarketPrice;
    if (metaPrice != null && metaPrice > 0) return metaPrice;
    const closes = chart?.indicators?.quote?.[0]?.close ?? [];
    for (let i = closes.length - 1; i >= 0; i--) {
      const close = closes[i];
      if (close != null && close > 0) return close;
    }
    return null;
  } catch {
    return null;
  }
}

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
          | Array<
            {
              timestamp?: number[];
              indicators?: { quote: Array<{ close: (number | null)[] }> };
            }
          >
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
