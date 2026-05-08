import { fetchCoinGeckoSimplePrices } from "../_shared/price-providers/coingecko.ts";
import { fetchYahooQuotes } from "../_shared/price-providers/yahoo.ts";

export interface CryptoPriceItem {
  symbol: string;
  yahooSymbol: string;
}

export async function fetchCryptoPricesFlow(items: CryptoPriceItem[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const yahooSymbols = items.map((item) => item.yahooSymbol);
  const yahooResult = await fetchYahooQuotes(yahooSymbols);

  for (const item of items) {
    const price = yahooResult[item.yahooSymbol];
    if (price != null) prices[item.symbol] = price;
  }

  const missing = items
    .filter((item) => prices[item.symbol] == null)
    .map((item) => item.symbol);
  const coingeckoResult = await fetchCoinGeckoSimplePrices(missing);
  for (const [symbol, price] of Object.entries(coingeckoResult)) {
    prices[symbol] = price;
  }

  return prices;
}
