/**
 * Pure portfolio series computation — extracted from usePortfolioHistory so it can be
 * unit-tested without React state or Supabase calls.
 */

import type { Holding } from '@networth/types'
import { nearestPriceForDate } from './fx-utils'

export const PRICEABLE_TYPES = new Set(['stock', 'etf', 'bond', 'mutual_fund', 'commodity', 'crypto'])

export interface RawTransaction {
  holding_id: string
  quantity: number
  price: number
  transaction_type: string
  /** ISO 8601 string; only the date part (YYYY-MM-DD) is used */
  executed_at: string
  /** ISO 4217 currency the price is denominated in */
  currency: string
}

export interface SeriesPoint {
  date: string
  costBasis: number
  marketValue: number
}

export type PriceHistory = Record<string, Array<{ date: string; price: number }>>
/** Key format: `${FROM}_${TO}_${YYYY-MM-DD}` */
export type FxRates = Record<string, number>

/**
 * Compute a portfolio time-series from raw inputs.
 *
 * For each date in `timeAxis` (must be sorted ascending):
 *   - Replays all transactions up to that date to track per-holding quantity and cost basis.
 *     The cost basis is stored in each holding's own currency and converted to `displayCurrency`
 *     per data point using the corresponding FX rate from `fxRates`.
 *   - Market value uses `priceHistory` (prices are in USD) when available,
 *     otherwise falls back to `manual_price` / `average_cost_basis` in the holding's currency.
 *
 * Conversion formula at each date:
 *   costBasis_display  = sum over holdings of: holdingCost_holdingCcy × fx(holdingCcy → display, date)
 *   marketValue_display = sum over holdings of: qty × price_USD × fx(USD → display, date)
 *                         OR: qty × fallback_holdingCcy × fx(holdingCcy → display, date)
 *
 * Falls back to rate 1.0 for any missing FX pair (graceful degradation, not an error).
 *
 * Leading points where both costBasis and marketValue are zero are trimmed so the
 * chart starts at the first investment date.
 */
/** Build chart time axis — array of "YYYY-MM-DD" strings, ascending. */
export function buildTimeAxis(period: '1w' | '1m' | '1y' | '5y'): string[] {
  const dates: string[] = []
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)

  if (period === '1w') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setUTCDate(d.getUTCDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
  } else if (period === '1m') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setUTCDate(d.getUTCDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
  } else if (period === '1y') {
    for (let i = 51; i >= 0; i--) {
      const d = new Date(now); d.setUTCDate(d.getUTCDate() - i * 7)
      dates.push(d.toISOString().slice(0, 10))
    }
  } else {
    // 59 monthly first-of-month points + today
    for (let i = 59; i >= 1; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      dates.push(d.toISOString().slice(0, 10))
    }
    dates.push(now.toISOString().slice(0, 10))
  }
  return dates
}

export function computeSeries(
  timeAxis: string[],
  transactions: RawTransaction[],
  holdings: Holding[],
  priceHistory: PriceHistory,
  fxRates: FxRates,
  displayCurrency: string,
): SeriesPoint[] {
  const holdingCurrencyMap = new Map(holdings.map((h) => [h.id, h.currency]))
  const display = displayCurrency.toUpperCase()

  /**
   * Look up `from → to` FX rate on a specific date.
   * Returns 1 when from === to (no conversion needed) or when the rate is missing.
   */
  function getFx(from: string, to: string, date: string): number {
    const f = from.toUpperCase()
    const t = to.toUpperCase()
    if (f === t) return 1
    return fxRates[`${f}_${t}_${date}`] ?? 1
  }

  // Date of the first transaction per holding (transactions are sorted ascending).
  // Used as the interpolation start point for manual-price holdings.
  const firstTxDate: Record<string, string> = {}
  for (const tx of transactions) {
    if (!firstTxDate[tx.holding_id]) {
      firstTxDate[tx.holding_id] = tx.executed_at.slice(0, 10)
    }
  }

  // Running per-holding state (mutated as we advance through transactions)
  const holdingQty: Record<string, number> = {}
  /** Cost of currently-held units, accumulated in the holding's own currency */
  const holdingCostInHoldingCcy: Record<string, number> = {}
  let txIdx = 0

  const all = timeAxis.map((dateStr) => {
    // Advance all transactions up to (and including) this date
    while (
      txIdx < transactions.length &&
      transactions[txIdx].executed_at.slice(0, 10) <= dateStr
    ) {
      const tx = transactions[txIdx]
      const holdingCcy = holdingCurrencyMap.get(tx.holding_id) ?? tx.currency
      const qty = Number(tx.quantity)
      // Convert transaction price into the holding's native currency at the transaction date
      const priceInHoldingCcy =
        Number(tx.price) * getFx(tx.currency, holdingCcy, tx.executed_at.slice(0, 10))

      if (tx.transaction_type === 'buy' || tx.transaction_type === 'deposit') {
        holdingQty[tx.holding_id] = (holdingQty[tx.holding_id] ?? 0) + qty
        holdingCostInHoldingCcy[tx.holding_id] =
          (holdingCostInHoldingCcy[tx.holding_id] ?? 0) + qty * priceInHoldingCcy
      } else if (tx.transaction_type === 'sell' || tx.transaction_type === 'withdrawal') {
        const currentQty = holdingQty[tx.holding_id] ?? 0
        const currentCost = holdingCostInHoldingCcy[tx.holding_id] ?? 0
        // Reduce cost basis by qty × running avg cost (average-cost method, not sell price)
        const avgCostPerUnit = currentQty > 0 ? currentCost / currentQty : 0
        holdingQty[tx.holding_id] = currentQty - qty
        holdingCostInHoldingCcy[tx.holding_id] = currentCost - qty * avgCostPerUnit
      }
      txIdx++
    }

    // Aggregate across all holdings, converting each to displayCurrency
    let costBasis = 0
    let marketValue = 0

    for (const h of holdings) {
      const holdingCcy = h.currency
      const qty = holdingQty[h.id] ?? 0
      const holdingCost = holdingCostInHoldingCcy[h.id] ?? 0

      costBasis += holdingCost * getFx(holdingCcy, display, dateStr)

      if (qty <= 0) continue

      const sym = h.symbol?.toUpperCase()
      const histPrice =
        sym && PRICEABLE_TYPES.has(h.asset_type)
          ? nearestPriceForDate(priceHistory[sym], dateStr)
          : null

      if (histPrice != null) {
        // API prices are in USD → convert to displayCurrency
        marketValue += qty * histPrice * getFx('USD', display, dateStr)
      } else if (
        h.manual_price != null &&
        (h.manual_price_date == null || dateStr >= h.manual_price_date)
      ) {
        // At or after manual_price_date: use manual_price directly.
        // manual_price is in holding.currency → convert to displayCurrency.
        marketValue += qty * h.manual_price * getFx(holdingCcy, display, dateStr)
      } else if (h.manual_price != null && h.manual_price_date != null) {
        // Before manual_price_date: linearly interpolate between avg cost per unit
        // and manual_price so the chart rises smoothly rather than jumping at
        // manual_price_date. Interpolation spans [first_tx_date, manual_price_date].
        const avgCostPerUnit = holdingCost / qty
        const startDate = firstTxDate[h.id]
        if (!startDate || startDate >= h.manual_price_date) {
          // Edge: no tx date or tx after manual date — stay at avg cost
          marketValue += qty * avgCostPerUnit * getFx(holdingCcy, display, dateStr)
        } else {
          const startMs = new Date(startDate + 'T12:00:00Z').getTime()
          const manualMs = new Date(h.manual_price_date + 'T12:00:00Z').getTime()
          const dateMs = new Date(dateStr + 'T12:00:00Z').getTime()
          const t = Math.max(0, Math.min(1, (dateMs - startMs) / (manualMs - startMs)))
          const interpolatedPrice = avgCostPerUnit + (h.manual_price - avgCostPerUnit) * t
          marketValue += qty * interpolatedPrice * getFx(holdingCcy, display, dateStr)
        }
      } else {
        // No live or manual price: use the running average cost of held units.
        // This makes marketValue = costBasis for non-priceable assets (the two lines overlap).
        const runningAvgCost = holdingCost / qty  // qty > 0 is guaranteed by the check above
        marketValue += qty * runningAvgCost * getFx(holdingCcy, display, dateStr)
      }
    }

    return { date: dateStr, costBasis, marketValue }
  })

  // Trim leading zero points (before any investment was made)
  const firstActive = all.findIndex((p) => p.costBasis > 0 || p.marketValue > 0)
  return firstActive > 0 ? all.slice(firstActive) : all
}
