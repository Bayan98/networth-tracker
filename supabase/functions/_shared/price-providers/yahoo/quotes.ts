import { YAHOO_HEADERS } from "./constants.ts";

export async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const result: Record<string, number> = {};
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;
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
      for (const quote of data?.quoteResponse?.result ?? []) {
        if (quote.regularMarketPrice != null && quote.regularMarketPrice > 0) {
          result[quote.symbol] = quote.regularMarketPrice;
        }
      }
    }
  } catch {
    // Yahoo's quote endpoint can reject requests while chart remains available.
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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`;
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
