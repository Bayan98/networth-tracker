import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompact,
  resolveAssetPrice,
  ASSET_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  INCOME_FREQUENCY_LABELS,
} from './formatters'

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats with explicit currency', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-500, 'USD')).toBe('-$500.00')
  })

  it('accepts Intl options override', () => {
    // Both min and max must be overridden together to avoid a RangeError
    expect(formatCurrency(1234.5678, 'USD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe('$1,235')
  })

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1_000_000, 'USD')).toBe('$1,000,000.00')
  })
})

describe('formatPercent', () => {
  it('adds + sign for positive values', () => {
    expect(formatPercent(5.25)).toBe('+5.25%')
  })

  it('adds no extra sign for negative values', () => {
    expect(formatPercent(-3.1)).toBe('-3.10%')
  })

  it('formats zero with + sign', () => {
    expect(formatPercent(0)).toBe('+0.00%')
  })

  it('respects custom decimal places', () => {
    expect(formatPercent(12.3456, 1)).toBe('+12.3%')
  })

  it('respects zero decimals', () => {
    expect(formatPercent(7.9, 0)).toBe('+8%')
  })
})

describe('formatNumber', () => {
  it('formats with 2 decimals by default', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57')
  })

  it('formats with custom decimals', () => {
    expect(formatNumber(1234.5, 0)).toBe('1,235')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0.00')
  })

  it('formats negative', () => {
    expect(formatNumber(-42.1)).toBe('-42.10')
  })

  it('pads to minimum fraction digits', () => {
    expect(formatNumber(1.1, 3)).toBe('1.100')
  })
})

describe('formatCompact', () => {
  it('formats thousands with K', () => {
    expect(formatCompact(1500, 'USD')).toBe('$1.5K')
  })

  it('formats millions with M', () => {
    expect(formatCompact(2_500_000, 'USD')).toBe('$2.5M')
  })

  it('formats small amounts without suffix', () => {
    expect(formatCompact(999, 'USD')).toBe('$999')
  })

  it('uses USD by default', () => {
    expect(formatCompact(10_000)).toBe('$10K')
  })
})

describe('resolveAssetPrice', () => {
  const base = { symbol: 'AAPL', average_cost_basis: 100, manual_price: null }

  it('returns live price when symbol matches prices map', () => {
    const result = resolveAssetPrice(base, { AAPL: 175 })
    expect(result).toEqual({ price: 175, source: 'live' })
  })

  it('is case-insensitive for symbol lookup', () => {
    const result = resolveAssetPrice({ ...base, symbol: 'aapl' }, { AAPL: 175 })
    expect(result).toEqual({ price: 175, source: 'live' })
  })

  it('falls back to manual_price when no live price', () => {
    const result = resolveAssetPrice({ ...base, manual_price: 150 }, {})
    expect(result).toEqual({ price: 150, source: 'manual' })
  })

  it('falls back to average_cost_basis as last resort', () => {
    const result = resolveAssetPrice(base, {})
    expect(result).toEqual({ price: 100, source: 'cost_basis' })
  })

  it('prefers live price over manual_price', () => {
    const result = resolveAssetPrice({ ...base, manual_price: 150 }, { AAPL: 175 })
    expect(result).toEqual({ price: 175, source: 'live' })
  })

  it('falls back to manual_price when symbol is null', () => {
    const asset = { symbol: null, average_cost_basis: 100, manual_price: 120 }
    const result = resolveAssetPrice(asset, { AAPL: 175 })
    expect(result).toEqual({ price: 120, source: 'manual' })
  })

  it('falls back to cost_basis when symbol is null and no manual_price', () => {
    const asset = { symbol: null, average_cost_basis: 80, manual_price: null }
    const result = resolveAssetPrice(asset, {})
    expect(result).toEqual({ price: 80, source: 'cost_basis' })
  })
})

describe('ASSET_TYPE_LABELS', () => {
  it('has a label for every asset type', () => {
    const expectedTypes = [
      'stock', 'bond', 'etf', 'crypto', 'mutual_fund',
      'real_estate', 'cash', 'commodity', 'deposit',
      'transport', 'business', 'other',
    ]
    for (const type of expectedTypes) {
      expect(ASSET_TYPE_LABELS[type], `missing label for "${type}"`).toBeTruthy()
    }
  })

  it('labels are non-empty strings', () => {
    for (const [key, label] of Object.entries(ASSET_TYPE_LABELS)) {
      expect(typeof label, key).toBe('string')
      expect(label.length, key).toBeGreaterThan(0)
    }
  })
})

describe('TRANSACTION_TYPE_LABELS', () => {
  it('has a label for every transaction type', () => {
    const expectedTypes = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'split']
    for (const type of expectedTypes) {
      expect(TRANSACTION_TYPE_LABELS[type], `missing label for "${type}"`).toBeTruthy()
    }
  })
})

describe('INCOME_FREQUENCY_LABELS', () => {
  it('has a label for every frequency', () => {
    const expectedFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'annually']
    for (const freq of expectedFrequencies) {
      expect(INCOME_FREQUENCY_LABELS[freq], `missing label for "${freq}"`).toBeTruthy()
    }
  })
})
