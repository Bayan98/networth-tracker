import { fetchFinnhubQuotes } from "../_shared/price-providers/finnhub.ts";
import { fetchStockAnalysisQuote } from "../_shared/price-providers/stockanalysis.ts";
import { fetchYahooQuotes } from "../_shared/price-providers/yahoo.ts";

export interface PriceablePriceItem {
  symbol: string;
  asset_type: string;
  exchange: string | null;
  ticker: string;
}

export interface PriceablePricesResult {
  prices: Record<string, number>;
  currencies: Record<string, string>;
}

export async function fetchPriceablePricesFlow(
  items: PriceablePriceItem[],
  finnhubToken: string | undefined,
): Promise<PriceablePricesResult> {
  const prices: Record<string, number> = {};
  const currencies: Record<string, string> = {};

  await Promise.all(items.map(async ({ symbol, asset_type }) => {
    const saResult = await fetchStockAnalysisQuote(symbol, asset_type);
    if (saResult.price != null && saResult.price > 0) {
      prices[symbol] = saResult.price;
      if (saResult.currency) currencies[symbol] = saResult.currency;
    }
  }));

  const missingPlain = items
    .filter(({ symbol, exchange }) => !exchange && prices[symbol] == null)
    .map(({ ticker }) => ticker);
  const yahooResult = await fetchYahooQuotes(missingPlain);
  for (const [symbol, price] of Object.entries(yahooResult)) {
    prices[symbol] = price;
  }

  const finnhubMissing = items
    .filter(({ symbol, exchange }) => !exchange && prices[symbol] == null)
    .map(({ ticker }) => ticker);
  const finnhubResult = await fetchFinnhubQuotes(finnhubMissing, finnhubToken);
  for (const [symbol, price] of Object.entries(finnhubResult)) {
    prices[symbol] = price;
  }

  return { prices, currencies };
}
