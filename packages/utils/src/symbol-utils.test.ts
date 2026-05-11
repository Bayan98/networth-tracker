import { describe, it, expect } from 'vitest'
import {
  parseSymbol,
  formatSymbolForDisplay,
  isExchangePrefixed,
  getPrimaryTicker,
  normalizeAssetSymbol,
} from './symbol-utils'

describe('parseSymbol', () => {
  it('parses plain symbol without exchange', () => {
    expect(parseSymbol('AAPL')).toEqual({ exchange: null, ticker: 'AAPL' })
  })

  it('parses lowercase symbol and uppercases it', () => {
    expect(parseSymbol('aapl')).toEqual({ exchange: null, ticker: 'AAPL' })
  })

  it('parses exchange-prefixed symbol', () => {
    expect(parseSymbol('LSE:HSBK')).toEqual({ exchange: 'LSE', ticker: 'HSBK' })
  })

  it('parses exchange-prefixed with lowercase and normalizes', () => {
    expect(parseSymbol('lse:hsbk')).toEqual({ exchange: 'LSE', ticker: 'HSBK' })
  })

  it('returns empty exchange and ticker for just colon', () => {
    expect(parseSymbol(':')).toEqual({ exchange: null, ticker: ':' })
  })

  it('handles colon at start', () => {
    expect(parseSymbol(':AAPL')).toEqual({ exchange: null, ticker: ':AAPL' })
  })

  it('handles multiple colons - takes first only', () => {
    expect(parseSymbol('EXC:Ticker:More')).toEqual({ exchange: 'EXC', ticker: 'TICKER:MORE' })
  })

  it('handles crypto format (no exchange)', () => {
    expect(parseSymbol('BTC')).toEqual({ exchange: null, ticker: 'BTC' })
  })

  it('handles empty string', () => {
    expect(parseSymbol('')).toEqual({ exchange: null, ticker: '' })
  })

  it('handles whitespace-only string', () => {
    expect(parseSymbol('   ')).toEqual({ exchange: null, ticker: '   ' })
  })
})

describe('formatSymbolForDisplay', () => {
  it('returns plain symbol as-is', () => {
    expect(formatSymbolForDisplay('AAPL')).toBe('AAPL')
  })

  it('formats exchange-prefixed symbol', () => {
    expect(formatSymbolForDisplay('LSE:HSBK')).toBe('LSE:HSBK')
  })

  it('normalizes lowercase to uppercase', () => {
    expect(formatSymbolForDisplay('lse:hsbk')).toBe('LSE:HSBK')
  })
})

describe('normalizeAssetSymbol', () => {
  it('keeps exchange prefixes for stocks', () => {
    expect(normalizeAssetSymbol('kase:hsbk', 'stock')).toBe('KASE:HSBK')
  })

  it('removes crypto exchange prefixes', () => {
    expect(normalizeAssetSymbol('CCC:BTC', 'crypto')).toBe('BTC')
  })

  it('removes crypto quote suffixes', () => {
    expect(normalizeAssetSymbol('BTC-USD', 'crypto')).toBe('BTC')
  })

  it('removes crypto exchange prefixes and quote suffixes together', () => {
    expect(normalizeAssetSymbol('CCC:BTC-USD', 'crypto')).toBe('BTC')
  })
})

describe('isExchangePrefixed', () => {
  it('returns false for plain symbol', () => {
    expect(isExchangePrefixed('AAPL')).toBe(false)
  })

  it('returns true for exchange-prefixed symbol', () => {
    expect(isExchangePrefixed('LSE:HSBK')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isExchangePrefixed('')).toBe(false)
  })

  it('returns true for colon-only (contains colon)', () => {
    expect(isExchangePrefixed(':')).toBe(true)
  })
})

describe('getPrimaryTicker', () => {
  it('returns ticker for plain symbol', () => {
    expect(getPrimaryTicker('AAPL')).toBe('AAPL')
  })

  it('returns bare ticker for exchange-prefixed', () => {
    expect(getPrimaryTicker('LSE:HSBK')).toBe('HSBK')
  })

  it('uppercases lowercase input', () => {
    expect(getPrimaryTicker('lse:hsbk')).toBe('HSBK')
  })
})
