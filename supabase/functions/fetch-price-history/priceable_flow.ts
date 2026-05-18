import {
  fetchStockAnalysisHistory,
  fetchStockAnalysisQuote,
  MINOR_CURRENCIES,
} from "../_shared/price-providers/stockanalysis/index.ts";
import {
  convertYahooCommodityHistory,
  fetchYahooCloseHistory,
  toYahooSymbol,
  type PricePoint,
} from "../_shared/price-providers/yahoo/index.ts";

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
  return await Promise.all(items.map(async ({ symbol: sym, asset_type }) => {
    let rawPoints: PricePoint[] | null = null;
    let currency: string | undefined;
    let rawCurrency: string | null = null;

    if (asset_type !== "commodity") {
      const [saPoints, saQuote] = await Promise.all([
        fetchStockAnalysisHistory(sym, asset_type, fetchFromTs, toTs, period),
        fetchStockAnalysisQuote(sym, asset_type),
      ]);
      if (saPoints.length > 0) rawPoints = saPoints;
      currency = saQuote.currency ?? undefined;
      rawCurrency = saQuote.rawCurrency;
    }

    if (!rawPoints) {
      const yahooSymbol = toYahooSymbol(sym);
      const yahooPoints = await fetchYahooCloseHistory(yahooSymbol, fetchFromTs, toTs);
      if (asset_type === "commodity") {
        rawPoints = convertYahooCommodityHistory(yahooSymbol, yahooPoints);
      } else if (yahooPoints.length > 0) {
        rawPoints = yahooPoints;
      }
    }

    if (!rawPoints || rawPoints.length === 0) {
      return { symbol: sym, asset_type, points: [] };
    }

    const minor = rawCurrency ? MINOR_CURRENCIES[rawCurrency] : null;
    const points = minor
      ? rawPoints.map((p) => ({ date: p.date, price: p.price / minor.factor }))
      : rawPoints;

    return {
      symbol: sym,
      asset_type,
      points,
      currency,
    };
  }));
}
