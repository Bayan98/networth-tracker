'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatPercent } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { Debt, CurrencyCode } from '@networth/types'
import { AddDebtDialog } from './add-debt-dialog'
import { EditDebtDialog } from './edit-debt-dialog'

interface Props {
  debts: Debt[]
  userId: string
  currency: CurrencyCode
}

export function DebtsClient({ debts, userId, currency }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const [showAdd, setShowAdd] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const totalDebt = debts.filter((d) => d.is_active).reduce((sum, d) => sum + Number(d.current_balance), 0)
  const totalMinPayment = debts.filter((d) => d.is_active).reduce((sum, d) => sum + Number(d.minimum_payment), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Total debt</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-danger)' }}>
            {hideAmounts ? '••••••' : formatCurrency(totalDebt, currency)}
          </p>
        </div>
        <div className="p-5 rounded-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Min. monthly payment</p>
          <p className="text-2xl font-bold mt-1">
            {hideAmounts ? '••••' : formatCurrency(totalMinPayment, currency)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold">Debts</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Plus size={12} /> Add debt
          </button>
        </div>

        {debts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No debts recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Name</th>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Balance</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Rate</th>
                  <th className="hidden md:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Min. payment</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {debts.map((d) => (
                  <tr key={d.id} className="group hover:bg-white/5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 md:px-5 py-3 font-medium">{d.name}</td>
                    <td className="px-4 md:px-5 py-3" style={{ color: 'var(--color-danger)' }}>
                      {hideAmounts ? '••••••' : formatCurrency(Number(d.current_balance), d.currency)}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3">{formatPercent(Number(d.interest_rate) * 100, 2)}</td>
                    <td className="hidden md:table-cell px-4 md:px-5 py-3">
                      {hideAmounts ? '••••' : formatCurrency(Number(d.minimum_payment), d.currency)}
                    </td>
                    <td className="px-2 md:px-3 py-3">
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingDebt(d)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          style={{ color: 'var(--color-muted-foreground)' }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          style={{ color: '#ef4444' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddDebtDialog userId={userId} defaultCurrency={currency} onClose={() => setShowAdd(false)} />
      )}
      {editingDebt && (
        <EditDebtDialog debt={editingDebt} onClose={() => setEditingDebt(null)} />
      )}
    </div>
  )
}
