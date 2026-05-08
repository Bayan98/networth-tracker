import { symbolToCoinGeckoId } from "../coingecko-symbol.ts";

export interface PricePoint {
  date: string;
  price: number;
}

export function coinGeckoIdForSymbol(symbol: string): string {
  return symbolToCoinGeckoId(symbol);
}

export function coinGeckoMarketChartToDailyPoints(rawPrices: [number, number][]): PricePoint[] {
  const daily = new Map<string, number>();
  for (const [ts, price] of rawPrices) {
    const date = new Date(ts).toISOString().slice(0, 10);
    daily.set(date, price);
  }
  return Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));
}

export async function fetchCoinGeckoSimplePrices(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const cgIds = symbols.map(coinGeckoIdForSymbol);
  const cgIdToSym: Record<string, string> = {};
  symbols.forEach((sym, i) => {
    cgIdToSym[cgIds[i]] = sym;
  });

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds.join(",")}&vs_currencies=usd`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    const data = await res.json() as Record<string, { usd: number }>;
    const prices: Record<string, number> = {};
    for (const [cgId, quote] of Object.entries(data)) {
      const sym = cgIdToSym[cgId];
      if (sym && quote.usd) prices[sym] = quote.usd;
    }
    return prices;
  } catch (e) {
    console.error("CoinGecko simple price error:", e);
    return {};
  }
}

export async function fetchCoinGeckoMarketChart(cgId: string, days: number): Promise<PricePoint[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`CoinGecko ${cgId} returned ${res.status} — falling back to Yahoo Finance`);
      return [];
    }
    const data = await res.json() as { prices: [number, number][] };
    return coinGeckoMarketChartToDailyPoints(data.prices ?? []);
  } catch (e) {
    console.error(`CoinGecko history error for ${cgId}:`, e);
    return [];
  }
}

export async function fetchCoinGeckoHistoricalPrice(symbol: string, date: string): Promise<number | null> {
  const cgId = coinGeckoIdForSymbol(symbol);
  const [yyyy, mm, dd] = date.split("-");
  const cgDate = `${dd}-${mm}-${yyyy}`;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${cgId}/history?date=${cgDate}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json() as { market_data?: { current_price?: { usd?: number } } };
    return data.market_data?.current_price?.usd ?? null;
  } catch {
    return null;
  }
}
