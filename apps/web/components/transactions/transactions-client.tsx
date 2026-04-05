'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@networth/utils'
import type { Transaction, Portfolio } from '@networth/types'
import { AddTransactionDialog } from './add-transaction-dialog'

interface Props {
  transactions: Transaction[]
  portfolios: Portfolio[]
  userId: string
}

const TX_TYPE_COLORS: Record<string, string> = {
  buy: 'var(--color-success)',
  sell: 'var(--color-danger)',
  dividend: '#6366f1',
  deposit: 'var(--color-success)',
  withdrawal: 'var(--color-danger)',
  fee: 'var(--color-warning)',
  interest: '#6366f1',
  split: '#a1a1aa',
  transfer: '#a1a1aa',
}

export function TransactionsClient({ transactions, portfolios, userId }: Props) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={14} /> Add transaction
        </button>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No transactions yet.
            </p>
          </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Date</th>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Symbol</th>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Type</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Quantity</th>
                  <th className="hidden md:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Price</th>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Total</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Fee</th>
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
                    <td className="px-4 md:px-5 py-3 font-medium">{tx.symbol}</td>
                    <td className="px-4 md:px-5 py-3">
                      <span
                        className="capitalize font-medium"
                        style={{ color: TX_TYPE_COLORS[tx.transaction_type] ?? 'inherit' }}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3">{Number(tx.quantity).toFixed(4)}</td>
                    <td className="hidden md:table-cell px-4 md:px-5 py-3">
                      {formatCurrency(Number(tx.price_per_unit), tx.currency)}
                    </td>
                    <td className="px-4 md:px-5 py-3 font-medium">
                      {formatCurrency(Number(tx.total_amount), tx.currency)}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                      {Number(tx.fee) > 0 ? formatCurrency(Number(tx.fee), tx.currency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddTransactionDialog
          portfolios={portfolios}
          userId={userId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
