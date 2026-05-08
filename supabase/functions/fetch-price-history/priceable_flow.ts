import {
  fetchStockAnalysisHistory,
  fetchStockAnalysisQuote,
  MINOR_CURRENCIES,
  parseSymbol,
} from "../_shared/price-providers/stockanalysis.ts";
import { fetchYahooCloseHistory, type PricePoint } from "../_shared/price-providers/yahoo.ts";

export interface PriceableHistoryItem {
  symbol: string;
  asset_type: string;
}

export interface PriceableHistoryResult {
  symbol: string;
  asset_type: string;
  points: PricePoint[];
  currency?: string;
}

export async function fetchPriceableHistoryFlow(
  items: PriceableHistoryItem[],
  fetchFromTs: number,
  toTs: number,
  period: string,
): Promise<PriceableHistoryResult[]> {
  return Promise.all(items.map(async ({ symbol: sym, asset_type }) => {
    const { exchange, ticker } = parseSymbol(sym);
    let rawPoints: PricePoint[] | null = null;

    const [saPoints, saQuote] = await Promise.all([
      fetchStockAnalysisHistory(sym, asset_type, fetchFromTs, toTs, period),
      fetchStockAnalysisQuote(sym, asset_type),
    ]);
    if (saPoints.length > 0) rawPoints = saPoints;

    if (!rawPoints && !exchange) {
      const yahooPoints = await fetchYahooCloseHistory(ticker, fetchFromTs, toTs);
      if (yahooPoints.length > 0) rawPoints = yahooPoints;
    }

    if (!rawPoints || rawPoints.length === 0) {
      return { symbol: sym, asset_type, points: [] };
    }

    const minor = saQuote.rawCurrency ? MINOR_CURRENCIES[saQuote.rawCurrency] : null;
    const points = minor
      ? rawPoints.map((p) => ({ date: p.date, price: p.price / minor.factor }))
      : rawPoints;

    return {
      symbol: sym,
      asset_type,
      points,
      currency: saQuote.currency ?? undefined,
    };
  }));
}
