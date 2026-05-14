import { fetchCoinGeckoSimplePrices } from "../_shared/price-providers/coingecko/index.ts";
import { fetchYahooQuotes } from "../_shared/price-providers/yahoo/index.ts";

export interface CryptoPriceItem {
  symbol: string;
  yahooSymbol: string;
}

export interface CryptoPriceProviders {
  fetchYahooQuotes: (symbols: string[]) => Promise<Record<string, number>>;
  fetchCoinGeckoSimplePrices: (symbols: string[]) => Promise<Record<string, number>>;
}

const DEFAULT_PROVIDERS: CryptoPriceProviders = {
  fetchYahooQuotes,
  fetchCoinGeckoSimplePrices,
};

export async function fetchCryptoPricesFlow(
  items: CryptoPriceItem[],
  providers: CryptoPriceProviders = DEFAULT_PROVIDERS,
): Promise<Record<string, number>> {
  if (items.length === 0) return {};
  const prices: Record<string, number> = {};
  const yahooSymbols = items.map((item) => item.yahooSymbol);
  const yahooResult = await safeRecord(() => providers.fetchYahooQuotes(yahooSymbols));

  for (const item of items) {
    const price = yahooResult[item.yahooSymbol];
    if (price != null) prices[item.symbol] = price;
  }

  const missing = items
    .filter((item) => prices[item.symbol] == null)
    .map((item) => item.symbol);
  const coingeckoResult = missing.length > 0
    ? await safeRecord(() => providers.fetchCoinGeckoSimplePrices(missing))
    : {};
  for (const [symbol, price] of Object.entries(coingeckoResult)) {
    prices[symbol] = price;
  }

  return prices;
}

async function safeRecord(fn: () => Promise<Record<string, number>>): Promise<Record<string, number>> {
  try {
    return await fn();
  } catch (error) {
    console.error("Error fetching prices in safeRecord:", error);
    return {};
  }
}
