'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { INCOME_FREQUENCY_LABELS } from '@networth/utils'
import type { ScheduledEvent, CurrencyCode, IncomeFrequency } from '@networth/types'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'

interface Props {
  events: ScheduledEvent[]
  userId: string
  currency: CurrencyCode
}

const FREQUENCY_MULTIPLIERS: Record<IncomeFrequency, number> = {
  daily: 365, weekly: 52, monthly: 12, quarterly: 4, annually: 1,
}

function annualize(amount: number, frequency: IncomeFrequency): number {
  return amount * (FREQUENCY_MULTIPLIERS[frequency] ?? 1)
}

function nextOccurrenceDate(event: ScheduledEvent): Date | null {
  const start = new Date(event.start_date)
  const now = new Date()
  if (start > now) return start
  const base = event.last_executed_at ? new Date(event.last_executed_at) : start
  const daysMap: Record<IncomeFrequency, number> = {
    daily: 1, weekly: 7, monthly: 30, quarterly: 91, annually: 365,
  }
  const next = new Date(base)
  next.setDate(next.getDate() + (daysMap[event.frequency] ?? 30))
  return next
}

function formatNextDate(event: ScheduledEvent): string {
  const d = nextOccurrenceDate(event)
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MiniStat({ label, value, sub, trend }: {
  label: string; value: string; sub: string; trend?: 'pos' | 'neg'
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val" style={{ fontSize: 22, marginBottom: 4 }}>{value}</div>
      <div className="kpi-sub" style={{ color: trend === 'pos' ? 'var(--pos)' : trend === 'neg' ? 'var(--neg)' : 'var(--ink-faint)' }}>
        {sub}
      </div>
    </div>
  )
}

export function ScheduledEventsClient({ events, userId, currency }: Props) {
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

  const activeIncome = events.filter((e) => e.is_active && e.transaction_type !== 'withdrawal')
  const totalMonthly = activeIncome.reduce((sum, e) => sum + annualize(Number(e.amount), e.frequency) / 12, 0)
  const totalAnnual = totalMonthly * 12

  const nextEvent = activeIncome
    .map((e) => ({ event: e, next: nextOccurrenceDate(e) }))
    .filter((x) => x.next !== null)
    .sort((a, b) => a.next!.getTime() - b.next!.getTime())[0]

  const nextDateStr = nextEvent
    ? nextEvent.next!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
  const nextSub = nextEvent
    ? `${nextEvent.event.name} · ${formatEventAmount(nextEvent.event)}`
    : 'No upcoming events'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="empty-label">Inflows</div>
          <h1>Income <em>streams.</em></h1>
          <p>Recurring and one-off sources feeding the net worth equation.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add source
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--density-gap)' }}>
        <MiniStat
          label="Monthly (recurring)"
          value={displayPrice(totalMonthly, currency, { maskLength: 6 })}
          sub={`${activeIncome.length} source${activeIncome.length !== 1 ? 's' : ''}`}
        />
        <MiniStat
          label="Annualized"
          value={displayPrice(totalAnnual, currency, { maskLength: 6 })}
          sub="Gross"
          trend="pos"
        />
        <MiniStat
          label="Next deposit"
          value={nextDateStr}
          sub={nextSub}
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-head"><h3>Sources</h3></div>
        {events.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p className="empty-label">No scheduled events yet.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Cadence</th>
                <th className="num">Amount</th>
                <th className="num">Next</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        display: 'grid', placeItems: 'center',
                        color: 'var(--pos)', flexShrink: 0,
                      }}>
                        <DollarSign size={14} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {ev.asset_id ? (
                            <Link href={`/assets/${ev.asset_id}`} style={{ color: 'var(--accent)' }}>
                              {ev.name}
                            </Link>
                          ) : ev.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>
                          {ev.is_active ? 'Recurring' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                    {INCOME_FREQUENCY_LABELS[ev.frequency]}
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {formatEventAmount(ev)}
                  </td>
                  <td className="num" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                    {formatNextDate(ev)}
                  </td>
                  <td style={{ width: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingEvent(ev)}
                        className="iconbtn"
                        style={{ width: 28, height: 28 }}
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="iconbtn"
                        style={{ width: 28, height: 28, color: 'var(--neg)' }}
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
        )}
      </div>

      {showAdd && (
        <AddScheduledEventDialog userId={userId} defaultCurrency={currency} onClose={() => setShowAdd(false)} />
      )}
      {editingEvent && (
        <EditScheduledEventDialog event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}
    </>
  )
}
