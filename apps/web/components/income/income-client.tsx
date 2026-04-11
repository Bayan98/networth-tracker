'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { ScheduledEvent, CurrencyCode, IncomeFrequency } from '@networth/types'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'

interface Props {
  events: ScheduledEvent[]
  userId: string
  currency: CurrencyCode
}

function annualize(amount: number, frequency: IncomeFrequency): number {
  const multipliers: Record<IncomeFrequency, number> = {
    daily: 365, weekly: 52, monthly: 12, quarterly: 4, annually: 1,
  }
  return amount * (multipliers[frequency] ?? 1)
}

export function ScheduledEventsClient({ events, userId, currency }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const [showAdd, setShowAdd] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const activeIncome = events.filter((e) => e.is_active && e.transaction_type !== 'withdrawal')
  const totalMonthly = activeIncome.reduce((sum, e) => sum + annualize(Number(e.amount), e.frequency) / 12, 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div
        className="p-5 rounded-xl flex items-center justify-between"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Monthly income (est.)</p>
          <p className="text-2xl font-bold mt-1">
            {hideAmounts ? '••••••' : formatCurrency(totalMonthly, currency)}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={14} /> Add event
        </button>
      </div>

      {/* Events list */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No scheduled events yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Name / Asset</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Type</th>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Amount</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Frequency</th>
                  <th className="hidden md:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Annual</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Status</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="group hover:bg-white/5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 md:px-5 py-3 font-medium">
                      {ev.asset_id ? (
                        <Link href={`/assets/${ev.asset_id}`} className="hover:underline" style={{ color: 'var(--color-accent)' }}>
                          {ev.name}
                        </Link>
                      ) : ev.name}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                      {TRANSACTION_TYPE_LABELS[ev.transaction_type] ?? ev.transaction_type}
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      {hideAmounts ? '••••' : formatCurrency(Number(ev.amount), ev.currency)}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                      {INCOME_FREQUENCY_LABELS[ev.frequency]}
                    </td>
                    <td className="hidden md:table-cell px-4 md:px-5 py-3">
                      {hideAmounts ? '••••••' : formatCurrency(annualize(Number(ev.amount), ev.frequency), ev.currency)}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: ev.is_active ? 'rgba(34,197,94,0.15)' : 'var(--color-muted)',
                          color: ev.is_active ? 'var(--color-success)' : 'var(--color-muted-foreground)',
                        }}
                      >
                        {ev.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 py-3">
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingEvent(ev)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          style={{ color: 'var(--color-muted-foreground)' }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id)}
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
        <AddScheduledEventDialog userId={userId} defaultCurrency={currency} onClose={() => setShowAdd(false)} />
      )}
      {editingEvent && (
        <EditScheduledEventDialog event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}
    </div>
  )
}
