/**
 * Pure FX conversion utilities — shared between the fetch-fx-rates Edge Function
 * and the usePortfolioHistory hook. Edge functions cannot import npm packages, so
 * the logic is duplicated there; this module exists purely so it can be unit-tested.
 */

export const FRANKFURTER_CURRENCIES = new Set([
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK',
  'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK',
  'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN',
  'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
])

/**
 * Returns true when both currencies are in the Frankfurter ECB set, meaning
 * historical rates are available. Otherwise use open.er-api.com (latest only).
 */
export function usesFrankfurter(from: string, to: string): boolean {
  return FRANKFURTER_CURRENCIES.has(from.toUpperCase()) &&
    FRANKFURTER_CURRENCIES.has(to.toUpperCase())
}

/**
 * Compute a from→to exchange rate using USD as the common base.
 *
 * `usdRates` maps each currency code to "how many units of that currency equal 1 USD"
 * (i.e. the standard open.er-api.com/v6/latest/USD response format).
 *
 * Cross-rate formula: rate(from→to) = usdRates[to] / usdRates[from]
 *
 * Returns null when either currency is missing from the rates map or when
 * `fromRate` is zero (division by zero guard).
 */
export function crossRate(
  usdRates: Record<string, number>,
  from: string,
  to: string,
): number | null {
  const f = from.toUpperCase()
  const t = to.toUpperCase()
  if (f === t) return 1
  const fromRate = usdRates[f]
  const toRate = usdRates[t]
  if (fromRate == null || toRate == null || fromRate === 0) return null
  return toRate / fromRate
}

/**
 * Given a sorted array of available date strings and a Map of date→rate,
 * find the rate for `requestedDate` using the following fallback chain:
 *   1. Exact match
 *   2. Most-recent date before requestedDate (handles weekends / market holidays)
 *   3. Earliest available date (handles requests before the series starts)
 *
 * Returns null only when `sortedDates` is empty.
 */
export function nearestRateForDate(
  sortedDates: string[],
  rateMap: Map<string, number>,
  requestedDate: string,
): number | null {
  if (sortedDates.length === 0) return null

  const exact = rateMap.get(requestedDate)
  if (exact != null) return exact

  // Most-recent date that is on or before the requested date
  const prev = sortedDates.filter((d) => d <= requestedDate)
  if (prev.length > 0) {
    const rate = rateMap.get(prev[prev.length - 1])
    if (rate != null) return rate
  }

  // Final fallback: earliest available date
  return rateMap.get(sortedDates[0]) ?? null
}

export function lookupFxRate(
  rates: Record<string, number>,
  from: string,
  to: string,
  date: string,
): number | null {
  const f = from.toUpperCase()
  const t = to.toUpperCase()
  if (f === t) return 1
  return rates[`${f}_${t}_${date}`] ?? null
}

/**
 * Find the most-recent price on or before `dateStr` from a sorted array of
 * price points. Returns null when no point exists on or before the date.
 */
export function nearestPriceForDate(
  history: Array<{ date: string; price: number }> | undefined,
  dateStr: string,
): number | null {
  if (!history || history.length === 0) return null
  let last: number | null = null
  for (const p of history) {
    if (p.date <= dateStr) last = p.price
    else break
  }
  return last
}
