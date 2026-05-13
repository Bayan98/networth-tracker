export interface ReplayTransaction {
  executed_at: string
  quantity: number | string
  transaction_type: string
}

export function replayQuantityAt(
  transactions: ReplayTransaction[],
  isoDate: string,
): number {
  const sorted = [...transactions].sort((a, b) =>
    a.executed_at.localeCompare(b.executed_at),
  )
  let qty = 0
  for (const tx of sorted) {
    const day = tx.executed_at.slice(0, 10)
    if (day > isoDate) break
    const n = Number(tx.quantity)
    if (!Number.isFinite(n)) continue
    switch (tx.transaction_type) {
      case 'buy':
      case 'deposit':
        qty += n
        break
      case 'sell':
      case 'withdrawal':
        qty -= n
        break
      case 'split':
        qty *= n
        break
    }
  }
  return qty
}
