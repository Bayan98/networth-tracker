import { describe, it, expect } from 'vitest'
import {
  calculateHoldingValuation,
  manualPriceForDate,
  resolveAssetPrice,
  safePercentChange,
} from './valuation-utils'

describe('safePercentChange', () => {
  it('returns percent change for valid finite inputs', () => {
    expect(safePercentChange(25, 100)).toBe(25)
    expect(safePercentChange(-10, 200)).toBe(-5)
  })

  it('returns null when change or base is null', () => {
    expect(safePercentChange(null, 100)).toBeNull()
    expect(safePercentChange(10, null)).toBeNull()
  })

  it('returns null when base is zero', () => {
    expect(safePercentChange(10, 0)).toBeNull()
    expect(safePercentChange(0, 0)).toBeNull()
  })

  it('returns null for non-finite results', () => {
    expect(safePercentChange(Number.MAX_VALUE, Number.MIN_VALUE)).toBeNull()
  })
})

describe('resolveAssetPrice', () => {
  const base = { symbol: 'AAPL', manual_price: null }

  it('returns live price when symbol matches prices map', () => {
    const result = resolveAssetPrice(base, { AAPL: 175 })
    expect(result).toEqual({ price: 175, source: 'live' })
  })

  it('is case-insensitive for symbol lookup', () => {
    const result = resolveAssetPrice({ ...base, symbol: 'aapl' }, { AAPL: 175 })
    expect(result).toEqual({ price: 175, source: 'live' })
  })

  it('prefers manual_price over live price', () => {
    const result = resolveAssetPrice({ ...base, manual_price: 150 }, { AAPL: 175 })
    expect(result).toEqual({ price: 150, source: 'manual' })
  })

  it('falls back to manual_price when symbol is null', () => {
    const asset = { symbol: null, manual_price: 120 }
    const result = resolveAssetPrice(asset, { AAPL: 175 })
    expect(result).toEqual({ price: 120, source: 'manual' })
  })

  it('returns 0 as cost_basis when no live or manual price exists', () => {
    expect(resolveAssetPrice(base, {})).toEqual({ price: 0, source: 'cost_basis' })
    expect(resolveAssetPrice({ symbol: null, manual_price: null }, {})).toEqual({ price: 0, source: 'cost_basis' })
  })
})

describe('manualPriceForDate', () => {
  it('uses manual price on and after the manual price date', () => {
    const asset = { symbol: 'AAPL', currency: 'USD', manual_price: 200, manual_price_date: '2024-02-01' }
    expect(manualPriceForDate(asset, '2024-02-01', 100, '2024-01-01')).toBe(200)
    expect(manualPriceForDate(asset, '2024-02-10', 100, '2024-01-01')).toBe(200)
  })

  it('interpolates before the manual price date', () => {
    const asset = { symbol: null, currency: 'USD', manual_price: 200, manual_price_date: '2024-01-11' }
    expect(manualPriceForDate(asset, '2024-01-06', 100, '2024-01-01')).toBe(150)
  })

  it('returns null when no manual price exists', () => {
    const asset = { symbol: 'AAPL', currency: 'USD', manual_price: null, manual_price_date: null }
    expect(manualPriceForDate(asset, '2024-01-01', 100, '2024-01-01')).toBeNull()
  })
})

describe('calculateHoldingValuation', () => {
  const liveAsset = { symbol: 'AAPL', currency: 'USD', manual_price: null, manual_price_date: null }
  const fx = (from: string) => from === 'USD' ? 1 : null

  it('calculates holding price return using current quantity and period-start price', () => {
    const result = calculateHoldingValuation({
      asset: liveAsset,
      prices: { AAPL: 125 },
      priceCurrencies: { AAPL: 'USD' },
      quantity: 10,
      averageCost: 90,
      periodStartPrice: 100,
      todayFx: fx,
    })

    expect(result.currentValue).toBe(1250)
    expect(result.periodStartValue).toBe(1000)
    expect(result.priceReturnAbs).toBe(250)
    expect(result.priceReturnPct).toBe(25)
  })

  it('does not calculate selected-period price return for manual prices', () => {
    const result = calculateHoldingValuation({
      asset: { ...liveAsset, manual_price: 120 },
      prices: { AAPL: 125 },
      priceCurrencies: { AAPL: 'USD' },
      quantity: 10,
      averageCost: 90,
      periodStartPrice: 100,
      todayFx: fx,
    })

    expect(result.source).toBe('manual')
    expect(result.currentPrice).toBe(120)
    expect(result.periodStartPrice).toBeNull()
    expect(result.priceReturnPct).toBeNull()
  })

  it('falls back to average cost as the current price when no manual or live price exists', () => {
    const result = calculateHoldingValuation({
      asset: { symbol: null, currency: 'USD', manual_price: null, manual_price_date: null },
      prices: {},
      priceCurrencies: {},
      quantity: 2,
      averageCost: 50,
      periodStartPrice: null,
      todayFx: fx,
    })

    expect(result.source).toBe('cost_basis')
    expect(result.currentPrice).toBe(50)
    expect(result.currentValue).toBe(100)
    expect(result.priceReturnPct).toBeNull()
  })
})
