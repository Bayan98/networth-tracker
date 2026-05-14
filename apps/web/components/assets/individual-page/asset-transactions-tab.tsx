import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { Asset, Transaction } from '@networth/types'
import { getAssetTypeConfig } from '../asset-type-config'
import { fmtDate, TX_BG, TX_INK } from './asset-detail-utils'

interface Props {
  transactions: Transaction[]
  asset: Asset
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

export function AssetTransactionsTab({ transactions, asset, onEdit, onDelete, onAdd }: Props) {
  const { displayPrice, displayQuantity, hideAmounts } = useAmountDisplay()
  const assetConfig = getAssetTypeConfig(asset.asset_type)

  if (transactions.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p className="empty-label" style={{ marginBottom: 8 }}>No transactions yet</p>
        <button className="btn btn-secondary" style={{ marginTop: 4 }} onClick={onAdd}>
          <Plus size={13} /> Add first transaction
        </button>
      </div>
    )
  }

  return (
    <div className="tab-table">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Date</th>
            <th>Note</th>
            {assetConfig.transactions.showQuantity && <th className="num">Qty</th>}
            <th className="num">Price</th>
            <th className="num">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const total = Number(transaction.quantity) * Number(transaction.price)
            const isCredit = transaction.transaction_type === 'sell' || transaction.transaction_type === 'withdrawal'
            const isCrossRate = transaction.currency.toUpperCase() !== asset.currency.toUpperCase()
            const rawNotes = transaction.notes ?? ''
            const isAuto = /\[auto:yahoo:(?:div|split):\d+\]/.test(rawNotes)
            const displayNotes = isAuto ? rawNotes.replace(/\s*\[auto:yahoo:(?:div|split):\d+\]\s*/g, '').trim() : rawNotes
            return (
              <tr key={transaction.id}>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 999,
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      border: '1px solid var(--border)',
                      background: TX_BG[transaction.transaction_type] ?? 'var(--surface-2)',
                      color: TX_INK[transaction.transaction_type] ?? 'var(--ink-2)',
                    }}>
                      {assetConfig.transactions.labels[transaction.transaction_type] ?? TRANSACTION_TYPE_LABELS[transaction.transaction_type] ?? transaction.transaction_type}
                    </span>
                    {isAuto && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 999,
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        border: '1px solid var(--border)',
                        color: 'var(--ink-faint)',
                      }}>auto</span>
                    )}
                  </div>
                </td>
                <td data-label="Date" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {fmtDate(transaction.executed_at)}
                </td>
                <td data-label="Note" style={{ color: 'var(--ink-2)' }}>{displayNotes || '—'}</td>
                {assetConfig.transactions.showQuantity && (
                  <td data-label="Qty" className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {displayQuantity(Number(transaction.quantity))}
                  </td>
                )}
                <td data-label="Price" className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {displayPrice(Number(transaction.price), transaction.currency)}
                  {isCrossRate && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--ink-faint)' }}>{transaction.currency}</span>}
                </td>
                <td data-label="Total" className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: isCredit ? 'var(--neg)' : 'var(--ink)' }}>
                  {hideAmounts ? displayPrice(total, transaction.currency) : (isCredit ? '-' : '') + displayPrice(Math.abs(total), transaction.currency)}
                </td>
                <td className="cell-actions">
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button className="iconbtn" style={{ width: 28, height: 28 }} onClick={() => onEdit(transaction)} title="Edit">
                      <Pencil size={12} />
                    </button>
                    <button className="iconbtn" style={{ width: 28, height: 28, color: 'var(--neg)' }} onClick={() => onDelete(transaction.id)} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
