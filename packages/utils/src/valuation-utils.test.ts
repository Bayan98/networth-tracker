import { describe, it, expect } from 'vitest'
import { safePercentChange } from './valuation-utils'

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
