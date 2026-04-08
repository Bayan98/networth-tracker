import { describe, it, expect } from 'vitest'
import {
  FRANKFURTER_CURRENCIES,
  usesFrankfurter,
  crossRate,
  nearestRateForDate,
  nearestPriceForDate,
} from './fx-utils'

// ── usesFrankfurter ──────────────────────────────────────────────────────────

describe('usesFrankfurter', () => {
  it('routes ECB pairs to Frankfurter', () => {
    expect(usesFrankfurter('USD', 'EUR')).toBe(true)
    expect(usesFrankfurter('GBP', 'JPY')).toBe(true)
    expect(usesFrankfurter('CHF', 'SEK')).toBe(true)
  })

  it('routes KZT pairs to open.er-api.com', () => {
    expect(usesFrankfurter('KZT', 'USD')).toBe(false)
    expect(usesFrankfurter('USD', 'KZT')).toBe(false)
    expect(usesFrankfurter('KZT', 'EUR')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(usesFrankfurter('usd', 'eur')).toBe(true)
    expect(usesFrankfurter('kzt', 'usd')).toBe(false)
  })

  it('same-currency pair (USD→USD) routes to Frankfurter', () => {
    // same-currency pairs are filtered out before routing, but the function
    // itself should return true since both are valid Frankfurter currencies
    expect(usesFrankfurter('USD', 'USD')).toBe(true)
  })

  it('FRANKFURTER_CURRENCIES set contains expected currencies', () => {
    const expected = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY']
    for (const ccy of expected) {
      expect(FRANKFURTER_CURRENCIES.has(ccy), `expected ${ccy} in set`).toBe(true)
    }
  })

  it('FRANKFURTER_CURRENCIES does not contain KZT or other non-ECB currencies', () => {
    const notExpected = ['KZT', 'UZS', 'AMD', 'AZN', 'GEL', 'MDL']
    for (const ccy of notExpected) {
      expect(FRANKFURTER_CURRENCIES.has(ccy), `${ccy} should not be in set`).toBe(false)
    }
  })
})

// ── crossRate ────────────────────────────────────────────────────────────────

describe('crossRate', () => {
  // Rates as returned by open.er-api.com/v6/latest/USD
  // "how many units of X equal 1 USD"
  const usdRates = { USD: 1, KZT: 450, EUR: 0.92, GBP: 0.79, RUB: 90 }

  it('same currency always returns 1', () => {
    expect(crossRate(usdRates, 'USD', 'USD')).toBe(1)
    expect(crossRate(usdRates, 'KZT', 'KZT')).toBe(1)
  })

  it('USD→KZT equals the raw rate in usdRates', () => {
    // USD is base (rate=1), so USD→KZT = 450/1 = 450
    expect(crossRate(usdRates, 'USD', 'KZT')).toBeCloseTo(450)
  })

  it('KZT→USD is the inverse of USD→KZT', () => {
    const kztToUsd = crossRate(usdRates, 'KZT', 'USD')
    const usdToKzt = crossRate(usdRates, 'USD', 'KZT')
    expect(kztToUsd).not.toBeNull()
    expect(usdToKzt).not.toBeNull()
    expect(kztToUsd! * usdToKzt!).toBeCloseTo(1)
  })

  it('KZT→EUR cross rate = EUR_rate / KZT_rate', () => {
    // 1 KZT in EUR = (EUR per USD) / (KZT per USD) = 0.92 / 450
    expect(crossRate(usdRates, 'KZT', 'EUR')).toBeCloseTo(0.92 / 450)
  })

  it('EUR→KZT cross rate = KZT_rate / EUR_rate', () => {
    expect(crossRate(usdRates, 'EUR', 'KZT')).toBeCloseTo(450 / 0.92)
  })

  it('EUR↔GBP cross rate is consistent', () => {
    const eurToGbp = crossRate(usdRates, 'EUR', 'GBP')
    const gbpToEur = crossRate(usdRates, 'GBP', 'EUR')
    expect(eurToGbp).not.toBeNull()
    expect(gbpToEur).not.toBeNull()
    expect(eurToGbp! * gbpToEur!).toBeCloseTo(1)
  })

  it('returns null for unknown from-currency', () => {
    expect(crossRate(usdRates, 'XYZ', 'USD')).toBeNull()
  })

  it('returns null for unknown to-currency', () => {
    expect(crossRate(usdRates, 'USD', 'XYZ')).toBeNull()
  })

  it('returns null when from-rate is zero (division by zero guard)', () => {
    expect(crossRate({ USD: 1, ZERO: 0 }, 'ZERO', 'USD')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(crossRate(usdRates, 'kzt', 'usd')).toBeCloseTo(1 / 450)
    expect(crossRate(usdRates, 'USD', 'kzt')).toBeCloseTo(450)
  })
})

// ── nearestRateForDate ───────────────────────────────────────────────────────

describe('nearestRateForDate', () => {
  // Mon–Fri with no Saturday/Sunday entries (simulates Frankfurter ECB data)
  const dates = ['2025-01-02', '2025-01-03', '2025-01-06', '2025-01-07', '2025-01-08']
  const rateMap = new Map([
    ['2025-01-02', 1.10],
    ['2025-01-03', 1.12],
    ['2025-01-06', 1.15], // Monday after weekend
    ['2025-01-07', 1.17],
    ['2025-01-08', 1.18],
  ])

  it('returns exact rate when date exists', () => {
    expect(nearestRateForDate(dates, rateMap, '2025-01-03')).toBe(1.12)
    expect(nearestRateForDate(dates, rateMap, '2025-01-06')).toBe(1.15)
  })

  it('Saturday falls back to the preceding Friday rate', () => {
    // 2025-01-04 is Saturday, last available is 2025-01-03
    expect(nearestRateForDate(dates, rateMap, '2025-01-04')).toBe(1.12)
  })

  it('Sunday falls back to the preceding Friday rate', () => {
    // 2025-01-05 is Sunday, last available is 2025-01-03
    expect(nearestRateForDate(dates, rateMap, '2025-01-05')).toBe(1.12)
  })

  it('date before series start returns earliest available rate', () => {
    expect(nearestRateForDate(dates, rateMap, '2024-12-31')).toBe(1.10)
  })

  it('date after series end returns most recent rate', () => {
    expect(nearestRateForDate(dates, rateMap, '2025-01-15')).toBe(1.18)
  })

  it('empty dates array returns null', () => {
    expect(nearestRateForDate([], new Map(), '2025-01-03')).toBeNull()
  })

  it('single-entry map returns that entry for any date', () => {
    const single = ['2025-06-01']
    const map = new Map([['2025-06-01', 2.0]])
    expect(nearestRateForDate(single, map, '2025-01-01')).toBe(2.0)
    expect(nearestRateForDate(single, map, '2025-06-01')).toBe(2.0)
    expect(nearestRateForDate(single, map, '2025-12-31')).toBe(2.0)
  })
})

// ── nearestPriceForDate ──────────────────────────────────────────────────────

describe('nearestPriceForDate', () => {
  const history = [
    { date: '2025-01-01', price: 100 },
    { date: '2025-01-03', price: 110 },
    { date: '2025-01-07', price: 120 },
  ]

  it('returns exact price when date matches', () => {
    expect(nearestPriceForDate(history, '2025-01-03')).toBe(110)
  })

  it('returns last price on or before the requested date', () => {
    expect(nearestPriceForDate(history, '2025-01-05')).toBe(110)
  })

  it('returns null for dates before the series starts', () => {
    expect(nearestPriceForDate(history, '2024-12-31')).toBeNull()
  })

  it('returns last price for dates after series end', () => {
    expect(nearestPriceForDate(history, '2025-12-31')).toBe(120)
  })

  it('returns null for empty history', () => {
    expect(nearestPriceForDate([], '2025-01-01')).toBeNull()
  })

  it('returns null for undefined history', () => {
    expect(nearestPriceForDate(undefined, '2025-01-01')).toBeNull()
  })
})
