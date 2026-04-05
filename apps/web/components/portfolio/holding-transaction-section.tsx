'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@networth/utils'
import type { Transaction, Portfolio, CurrencyCode } from '@networth/types'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'

const TX_TYPE_COLORS: Record<string, string> = {
  buy: 'var(--color-success)',
  sell: 'var(--color-danger)',
  dividend: '#6366f1',
  coupon: '#6366f1',
  rental_income: '#6366f1',
  deposit: 'var(--color-success)',
  withdrawal: 'var(--color-danger)',
  interest: '#6366f1',
  split: '#a1a1aa',
  transfer: '#a1a1aa',
  salary: 'var(--color-success)',
  debt_payment: 'var(--color-danger)',
}

interface Props {
  transactions: Transaction[]
  portfolios: Portfolio[]
  holdingId: string
  currency: CurrencyCode
  userId: string
}

export function HoldingTransactionSection({ transactions, portfolios, holdingId, currency, userId }: Props) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold">Transaction History</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={12} /> Add transaction
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            No transactions recorded.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Date</th>
              <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Type</th>
              <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Quantity</th>
              <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Price</th>
              <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Total</th>
              <th className="hidden md:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Fee</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-white/5"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <td className="px-4 md:px-5 py-3 text-xs md:text-sm">
                  {new Date(tx.executed_at).toLocaleDateString()}
                </td>
                <td className="px-4 md:px-5 py-3">
                  <span
                    className="capitalize font-medium"
                    style={{ color: TX_TYPE_COLORS[tx.transaction_type] ?? 'inherit' }}
                  >
                    {tx.transaction_type.replace('_', ' ')}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 md:px-5 py-3 tabular-nums">{Number(tx.quantity).toFixed(4)}</td>
                <td className="hidden sm:table-cell px-4 md:px-5 py-3 tabular-nums">
                  {formatCurrency(Number(tx.price), tx.currency)}
                </td>
                <td className="px-4 md:px-5 py-3 font-medium tabular-nums">
                  {formatCurrency(Number(tx.quantity) * Number(tx.price), tx.currency)}
                </td>
                <td className="hidden md:table-cell px-4 md:px-5 py-3 tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                  {Number(tx.fee) > 0 ? formatCurrency(Number(tx.fee), tx.currency) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {showAdd && (
        <AddTransactionDialog
          portfolios={portfolios}
          userId={userId}
          holdingId={holdingId}
          defaultCurrency={currency}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
