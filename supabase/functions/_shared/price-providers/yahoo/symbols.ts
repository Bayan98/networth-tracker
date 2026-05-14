import {
  GRAMS_PER_TROY_OUNCE,
  PER_GRAM_COMMODITY_CACHE_SUFFIX,
  PER_GRAM_COMMODITY_SYMBOLS,
  YAHOO_EXCHANGE_SUFFIXES,
} from "./constants.ts";
import type { PricePoint } from "./types.ts";

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
  return isPerGramCommoditySymbol(symbol) ? price / GRAMS_PER_TROY_OUNCE : price;
}

export function convertYahooCommodityHistory(symbol: string, points: PricePoint[]): PricePoint[] {
  if (!isPerGramCommoditySymbol(symbol)) return points;
  return points.map((point) => ({
    ...point,
    price: point.price / GRAMS_PER_TROY_OUNCE,
  }));
}

export function isPerGramCommoditySymbol(symbol: string): boolean {
  return PER_GRAM_COMMODITY_SYMBOLS.has(symbol.toUpperCase().trim());
}

export function perGramCommodityCacheSuffix(symbol: string): string {
  return isPerGramCommoditySymbol(symbol) ? PER_GRAM_COMMODITY_CACHE_SUFFIX : "";
}
