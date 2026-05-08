import { fetchFinnhubQuotes } from "../_shared/price-providers/finnhub.ts";
import { fetchStockAnalysisQuote, type SAResult } from "../_shared/price-providers/stockanalysis.ts";
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

export interface PriceablePriceProviders {
  fetchStockAnalysisQuote: (symbol: string, assetType?: string) => Promise<SAResult>;
  fetchYahooQuotes: (symbols: string[]) => Promise<Record<string, number>>;
  fetchFinnhubQuotes: (symbols: string[], token: string | undefined) => Promise<Record<string, number>>;
}

const DEFAULT_PROVIDERS: PriceablePriceProviders = {
  fetchStockAnalysisQuote,
  fetchYahooQuotes,
  fetchFinnhubQuotes,
};

export async function fetchPriceablePricesFlow(
  items: PriceablePriceItem[],
  finnhubToken: string | undefined,
  providers: PriceablePriceProviders = DEFAULT_PROVIDERS,
): Promise<PriceablePricesResult> {
  const prices: Record<string, number> = {};
  const currencies: Record<string, string> = {};

  await Promise.all(items.map(async ({ symbol, asset_type }) => {
    const saResult = await safeQuote(() => providers.fetchStockAnalysisQuote(symbol, asset_type));
    if (saResult.price != null && saResult.price > 0) {
      prices[symbol] = saResult.price;
      if (saResult.currency) currencies[symbol] = saResult.currency;
    }
  }));

  const missingPlain = items
    .filter(({ symbol, exchange }) => !exchange && prices[symbol] == null)
    .map(({ ticker }) => ticker);
  const yahooResult = missingPlain.length > 0
    ? await safeRecord(() => providers.fetchYahooQuotes(missingPlain))
    : {};
  for (const [symbol, price] of Object.entries(yahooResult)) {
    prices[symbol] = price;
  }

  const finnhubMissing = items
    .filter(({ symbol, exchange }) => !exchange && prices[symbol] == null)
    .map(({ ticker }) => ticker);
  const finnhubResult = finnhubMissing.length > 0
    ? await safeRecord(() => providers.fetchFinnhubQuotes(finnhubMissing, finnhubToken))
    : {};
  for (const [symbol, price] of Object.entries(finnhubResult)) {
    prices[symbol] = price;
  }

  return { prices, currencies };
}

function emptyQuote(): SAResult {
  return { price: null, name: null, currency: null, rawCurrency: null, description: null };
}

async function safeQuote(fn: () => Promise<SAResult>): Promise<SAResult> {
  try {
    return await fn();
  } catch {
    return emptyQuote();
  }
}

async function safeRecord(fn: () => Promise<Record<string, number>>): Promise<Record<string, number>> {
  try {
    return await fn();
  } catch {
    return {};
  }
}
