import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompact,
  currencySymbol,
  displayHiddenPrice,
  displayPrice,
  displayQuantity,
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

describe('displayHiddenPrice', () => {
  it('gets a narrow currency symbol', () => {
    expect(currencySymbol('USD')).toBe('$')
  })

  it('uses a five-character mask by default', () => {
    expect(displayHiddenPrice()).toBe('$$$$$')
  })

  it('supports custom mask lengths', () => {
    expect(displayHiddenPrice('USD', 3)).toBe('$$$')
  })

  it('uses the requested currency symbol', () => {
    expect(displayHiddenPrice('EUR', 3)).toBe('€€€')
  })

  it('keeps the mask non-empty', () => {
    expect(displayHiddenPrice(0)).toBe('$')
  })
})

describe('displayPrice', () => {
  it('shows loading before masking', () => {
    expect(displayPrice(100, 'USD', { hideAmounts: true, loading: true })).toBe('…')
  })

  it('masks hidden prices', () => {
    expect(displayPrice(100, 'USD', { hideAmounts: true, maskLength: 4 })).toBe('$$$$')
  })

  it('masks hidden prices with the requested currency symbol', () => {
    expect(displayPrice(100, 'EUR', { hideAmounts: true, maskLength: 4 })).toBe('€€€€')
  })

  it('formats visible prices', () => {
    expect(displayPrice(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('formats signed prices', () => {
    expect(displayPrice(12, 'USD', { withSign: true })).toBe('+$12.00')
    expect(displayPrice(-12, 'USD', { withSign: true })).toBe('-$12.00')
  })

  it('returns an empty placeholder for missing prices', () => {
    expect(displayPrice(null, 'USD')).toBe('—')
  })
})

describe('displayQuantity', () => {
  it('shows loading before masking', () => {
    expect(displayQuantity(10, { hideAmounts: true, loading: true })).toBe('…')
  })

  it('masks hidden quantities with X', () => {
    expect(displayQuantity(10, { hideAmounts: true })).toBe('X')
  })

  it('formats visible quantities', () => {
    expect(displayQuantity(1234.56789, { maximumFractionDigits: 2 })).toBe('1,234.57')
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
