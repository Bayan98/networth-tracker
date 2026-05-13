import { describe, expect, it } from 'vitest'
import { replayQuantityAt, type ReplayTransaction } from './transaction-replay'

describe('replayQuantityAt', () => {
  it('returns 0 when no transactions exist', () => {
    expect(replayQuantityAt([], '2024-06-01')).toBe(0)
  })

  it('sums buys and subtracts sells up to the cutoff', () => {
    const txs: ReplayTransaction[] = [
      { executed_at: '2024-01-01', quantity: 10, transaction_type: 'buy' },
      { executed_at: '2024-02-01', quantity: 4, transaction_type: 'sell' },
      { executed_at: '2024-03-01', quantity: 5, transaction_type: 'buy' },
    ]
    expect(replayQuantityAt(txs, '2024-02-15')).toBe(6)
    expect(replayQuantityAt(txs, '2024-03-31')).toBe(11)
  })

  it('multiplies quantity through splits in chronological order', () => {
    const txs: ReplayTransaction[] = [
      { executed_at: '2024-01-01', quantity: 30, transaction_type: 'buy' },
      { executed_at: '2024-06-01', quantity: 4, transaction_type: 'split' },
      { executed_at: '2024-07-01', quantity: 10, transaction_type: 'buy' },
    ]
    expect(replayQuantityAt(txs, '2024-05-01')).toBe(30)
    expect(replayQuantityAt(txs, '2024-06-15')).toBe(120)
    expect(replayQuantityAt(txs, '2024-08-01')).toBe(130)
  })

  it('ignores dividend rows', () => {
    const txs: ReplayTransaction[] = [
      { executed_at: '2024-01-01', quantity: 10, transaction_type: 'buy' },
      { executed_at: '2024-02-01', quantity: 10, transaction_type: 'dividend' },
    ]
    expect(replayQuantityAt(txs, '2024-03-01')).toBe(10)
  })

  it('handles unsorted input and string quantities', () => {
    const txs: ReplayTransaction[] = [
      { executed_at: '2024-03-01', quantity: '5', transaction_type: 'buy' },
      { executed_at: '2024-01-01', quantity: '10', transaction_type: 'buy' },
      { executed_at: '2024-02-01', quantity: '2', transaction_type: 'split' },
    ]
    expect(replayQuantityAt(txs, '2024-12-31')).toBe(25)
  })
})
