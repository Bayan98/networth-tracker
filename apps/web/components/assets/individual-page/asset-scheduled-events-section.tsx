'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { ScheduledEvent, CurrencyCode } from '@networth/types'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'

interface Props {
  events: ScheduledEvent[]
  assetId: string
  userId: string
  currency: CurrencyCode
}

export function AssetScheduledEventsSection({ events, assetId, userId, currency }: Props) {
  const router = useRouter()
  const { displayPrice } = useAmountDisplay()
  const [showAdd, setShowAdd] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

  function formatEventAmount(event: ScheduledEvent): string {
    if (event.amount_type === 'percent') return `${Number(event.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
    return displayPrice(Number(event.amount), event.currency)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
    if (!error) router.refresh()
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold">Scheduled Events</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={12} /> Add event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            No scheduled events for this asset.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Name</th>
                <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Type</th>
                <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Amount</th>
                <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Frequency</th>
                <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Status</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  className="group hover:bg-white/5"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 md:px-5 py-3 font-medium">{ev.name}</td>
                  <td className="hidden sm:table-cell px-4 md:px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                    {TRANSACTION_TYPE_LABELS[ev.transaction_type] ?? ev.transaction_type}
                  </td>
                  <td className="px-4 md:px-5 py-3 tabular-nums">
                    {formatEventAmount(ev)}
                  </td>
                  <td className="hidden sm:table-cell px-4 md:px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                    {INCOME_FREQUENCY_LABELS[ev.frequency]}
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

      {showAdd && (
        <AddScheduledEventDialog
          userId={userId}
          assetId={assetId}
          defaultCurrency={currency}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingEvent && (
        <EditScheduledEventDialog
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  )
}
