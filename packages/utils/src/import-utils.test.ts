import { describe, it, expect } from 'vitest'
import { parseCSVLine, parseAndVerify } from './import-utils'

// ── parseCSVLine ─────────────────────────────────────────────────────────────

describe('parseCSVLine', () => {
  it('splits simple comma-separated values', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas inside', () => {
    expect(parseCSVLine('"Apple Inc, Inc",AAPL,stock')).toEqual(['Apple Inc, Inc', 'AAPL', 'stock'])
  })

  it('handles empty fields', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })

  it('handles trailing comma', () => {
    expect(parseCSVLine('a,b,')).toEqual(['a', 'b', ''])
  })

  it('trims whitespace from fields', () => {
    expect(parseCSVLine('  a  ,  b  ,  c  ')).toEqual(['a', 'b', 'c'])
  })

  it('handles single field', () => {
    expect(parseCSVLine('only')).toEqual(['only'])
  })

  it('handles all empty fields', () => {
    expect(parseCSVLine(',,')).toEqual(['', '', ''])
  })
})

// ── parseAndVerify ────────────────────────────────────────────────────────────

describe('parseAndVerify', () => {
  it('returns empty array for empty input', () => {
    expect(parseAndVerify('')).toEqual([])
    expect(parseAndVerify('   \n  \n  ')).toEqual([])
  })

  it('skips header row when asset_name header detected', () => {
    const text = 'asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes\nApple Inc,AAPL,stock,USD,buy,10,145,2024-01-15,'
    const rows = parseAndVerify(text)
    expect(rows).toHaveLength(1)
    expect(rows[0].asset_name).toBe('Apple Inc')
    expect(rows[0].rowNum).toBe(2)
  })

  it('does not skip first row when no header detected', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,10,145,2024-01-15,'
    const rows = parseAndVerify(text)
    expect(rows).toHaveLength(1)
    expect(rows[0].rowNum).toBe(1)
  })

  it('parses a valid buy transaction row with no errors', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,10,145.00,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors).toEqual([])
    expect(row.asset_name).toBe('Apple Inc')
    expect(row.symbol).toBe('AAPL')
    expect(row.asset_type).toBe('stock')
    expect(row.currency).toBe('USD')
    expect(row.transaction_type).toBe('buy')
    expect(row.quantity).toBe('10')
    expect(row.price).toBe('145.00')
    expect(row.date).toBe('2024-01-15')
  })

  it('normalises asset_type to lowercase and currency to uppercase', () => {
    const text = 'Apple Inc,AAPL,STOCK,usd,buy,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.asset_type).toBe('stock')
    expect(row.currency).toBe('USD')
    expect(row.errors).toEqual([])
  })

  it('parses a valid manual price row (no transaction_type)', () => {
    const text = 'My Apartment,,real_estate,USD,,1,450000,2024-03-01,NYC property'
    const [row] = parseAndVerify(text)
    expect(row.errors).toEqual([])
    expect(row.transaction_type).toBe('')
    expect(row.price).toBe('450000')
    expect(row.notes).toBe('NYC property')
  })

  it('allows optional fields to be blank', () => {
    const text = 'My Asset,,other,,,,,,'
    const [row] = parseAndVerify(text)
    expect(row.errors).toEqual([])
    expect(row.symbol).toBe('')
    expect(row.currency).toBe('')
    expect(row.transaction_type).toBe('')
  })

  it('errors on missing asset_name', () => {
    const text = ',,stock,USD,buy,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors).toContain('asset_name is required')
  })

  it('errors on missing asset_type', () => {
    const text = 'Apple Inc,AAPL,,USD,buy,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors).toContain('asset_type is required')
  })

  it('errors on invalid asset_type', () => {
    const text = 'Apple Inc,AAPL,widget,USD,buy,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('not a valid asset_type'))).toBe(true)
  })

  it('errors on invalid transaction_type', () => {
    const text = 'Apple Inc,AAPL,stock,USD,purchase,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('not a valid transaction_type'))).toBe(true)
  })

  it('errors on missing quantity when transaction_type is set', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('quantity must be a number'))).toBe(true)
  })

  it('errors on non-numeric quantity when transaction_type is set', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,ten,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('quantity must be a number'))).toBe(true)
  })

  it('errors on missing price when transaction_type is set', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,10,,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('price must be a number'))).toBe(true)
  })

  it('errors on non-numeric price when transaction_type is set', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,10,one-forty-five,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('price must be a number'))).toBe(true)
  })

  it('errors on non-numeric price when no transaction_type', () => {
    const text = 'My Apartment,,real_estate,USD,,,not-a-number,2024-03-01,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('price must be a number'))).toBe(true)
  })

  it('does not error when price is blank and no transaction_type', () => {
    const text = 'My Asset,,other,,,,,,,'
    const [row] = parseAndVerify(text)
    expect(row.errors.filter(e => e.includes('price'))).toHaveLength(0)
  })

  it('errors on invalid date format', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,10,145,15-01-2024,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('errors on date with wrong separator', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,10,145,2024/01/15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('allows blank date without error', () => {
    const text = 'Apple Inc,AAPL,stock,USD,buy,10,145,,'
    const [row] = parseAndVerify(text)
    expect(row.errors.filter(e => e.includes('YYYY-MM-DD'))).toHaveLength(0)
  })

  it('errors on currency code that is not 3 letters', () => {
    const text = 'Apple Inc,AAPL,stock,US,buy,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.some(e => e.includes('3-letter currency'))).toBe(true)
  })

  it('allows blank currency without error', () => {
    const text = 'Apple Inc,AAPL,stock,,buy,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.errors.filter(e => e.includes('currency'))).toHaveLength(0)
  })

  it('handles multiple rows and assigns correct rowNums with header', () => {
    const text = [
      'asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes',
      'Apple Inc,AAPL,stock,USD,buy,10,145,2024-01-15,',
      'Bitcoin,BTC,crypto,USD,buy,0.5,42000,2024-02-01,',
    ].join('\n')
    const rows = parseAndVerify(text)
    expect(rows).toHaveLength(2)
    expect(rows[0].rowNum).toBe(2)
    expect(rows[1].rowNum).toBe(3)
  })

  it('handles multiple rows and assigns correct rowNums without header', () => {
    const text = [
      'Apple Inc,AAPL,stock,USD,buy,10,145,2024-01-15,',
      'Bitcoin,BTC,crypto,USD,buy,0.5,42000,2024-02-01,',
    ].join('\n')
    const rows = parseAndVerify(text)
    expect(rows).toHaveLength(2)
    expect(rows[0].rowNum).toBe(1)
    expect(rows[1].rowNum).toBe(2)
  })

  it('accumulates multiple errors on a single row', () => {
    const text = ',,widget,US,purchase,ten,bad-price,not-a-date,'
    const [row] = parseAndVerify(text)
    expect(row.errors.length).toBeGreaterThan(2)
  })

  it('accepts all valid asset types', () => {
    const types = ['stock', 'bond', 'etf', 'crypto', 'mutual_fund', 'real_estate', 'cash', 'commodity', 'deposit', 'transport', 'business', 'other']
    for (const type of types) {
      const [row] = parseAndVerify(`Asset,,${type},,,,,,`)
      expect(row.errors.filter(e => e.includes('asset_type'))).toHaveLength(0)
    }
  })

  it('accepts all valid transaction types', () => {
    const types = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'split']
    for (const type of types) {
      const [row] = parseAndVerify(`Asset,,stock,USD,${type},1,100,2024-01-01,`)
      expect(row.errors.filter(e => e.includes('transaction_type'))).toHaveLength(0)
    }
  })

  it('handles quoted fields with commas in asset_name', () => {
    const text = '"Apple Inc, Class A",AAPL,stock,USD,buy,10,145,2024-01-15,'
    const [row] = parseAndVerify(text)
    expect(row.asset_name).toBe('Apple Inc, Class A')
    expect(row.errors).toEqual([])
  })
})
