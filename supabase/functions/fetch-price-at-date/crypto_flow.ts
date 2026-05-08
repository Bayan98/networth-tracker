import { fetchCoinGeckoHistoricalPrice } from "../_shared/price-providers/coingecko.ts";
import { fetchYahooCloseHistory, fetchYahooQuotes } from "../_shared/price-providers/yahoo.ts";

export async function fetchCryptoPriceAtDateFlow(
  symbol: string,
  date: string,
  dateEpoch: number,
  period1: number,
  period2: number,
  isToday: boolean,
): Promise<number | null> {
  if (isToday) {
    const quotes = await fetchYahooQuotes([`${symbol}-USD`]);
    return quotes[`${symbol}-USD`] ?? null;
  }

  const coingeckoPrice = await fetchCoinGeckoHistoricalPrice(symbol, date);
  if (coingeckoPrice != null) return coingeckoPrice;

  const yahooPoints = await fetchYahooCloseHistory(`${symbol}-USD`, period1, period2);
  let price: number | null = null;
  let minDiff = Infinity;
  for (const point of yahooPoints) {
    const ts = new Date(point.date + "T12:00:00Z").getTime() / 1000;
    const diff = Math.abs(ts - dateEpoch);
    if (diff < minDiff) {
      minDiff = diff;
      price = point.price;
    }
  }
  return price;
}
