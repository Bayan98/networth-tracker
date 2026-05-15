'use client'

import { useMemo, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { currencySymbol, INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { Asset, Portfolio, ScheduledEvent, CurrencyCode, IncomeFrequency } from '@networth/types'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'
import { usePortfolioValuation } from '@/lib/hooks/use-portfolio-valuation'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { getAssetTypeConfig } from '@/components/assets/asset-type-config'
import { MoneyText, LoadingText } from '@/components/ui/money-text'

type IncomeEventAsset = Asset & {
  portfolio?: Pick<Portfolio, 'id' | 'name'> | null
}

type IncomeEvent = ScheduledEvent & {
  asset?: IncomeEventAsset | null
}

interface Props {
  events: IncomeEvent[]
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

function formatPercent(value: number): string {
  return `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

function MiniStat({ label, value, sub, trend }: {
  label: string; value: ReactNode; sub: ReactNode; trend?: 'pos' | 'neg'
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
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

  const _selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const selectedCurrency = isMounted ? _selectedCurrency : currency

  const linkedAssets = useMemo(() => {
    const byId = new Map<string, Asset>()
    for (const event of events) {
      if (event.asset) byId.set(event.asset.id, event.asset)
    }
    return [...byId.values()]
  }, [events])

  const {
    valuations,
    loading: valuationLoading,
    chartLoading: valuationChartLoading,
    pricesLoading,
  } = usePortfolioValuation(linkedAssets, '1m', selectedCurrency)
  const { fx, loading: fixedFxLoading } = useTodayFx(
    events.map((event) => ({ currency: event.currency })),
    selectedCurrency,
  )

  const valueByAssetId = useMemo(() => {
    const result: Record<string, number | null> = {}
    for (const valuation of valuations) {
      result[valuation.asset.id] = valuation.value
    }
    return result
  }, [valuations])

  const hasPercentEvents = events.some((event) => event.amount_type === 'percent' && event.asset_id)
  const amountLoading = fixedFxLoading || (hasPercentEvents && (valuationLoading || valuationChartLoading || pricesLoading))

  function convertedFixedAmount(event: IncomeEvent): number | null {
    const rate = fx(event.currency)
    if (rate === null) return null
    return Number(event.amount) * rate
  }

  function percentAmount(event: IncomeEvent): number | null {
    if (!event.asset_id) return null
    const baseValue = valueByAssetId[event.asset_id]
    if (baseValue == null) return null
    return baseValue * (Number(event.amount) / 100)
  }

  function percentAmountInEventCurrency(event: IncomeEvent): number | null {
    const selectedAmount = percentAmount(event)
    if (selectedAmount === null) return null
    const rate = fx(event.currency)
    if (rate === null || rate === 0) return null
    return selectedAmount / rate
  }

  function eventAmountValue(event: IncomeEvent): number | null {
    return event.amount_type === 'percent' ? percentAmount(event) : convertedFixedAmount(event)
  }

  function eventAmountLoading(event: IncomeEvent): boolean {
    if (!isMounted) return true
    return event.amount_type === 'percent' && (fixedFxLoading || (hasPercentEvents && (valuationLoading || valuationChartLoading || pricesLoading)))
  }

  function formatEventAmount(event: IncomeEvent): ReactNode {
    const loading = eventAmountLoading(event)
    if (event.amount_type === 'percent') {
      if (loading) return <LoadingText loading skelWidth={96}>{null}</LoadingText>
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          <span className="delta-pill pos">{formatPercent(Number(event.amount))}</span>
          <span style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>·</span>
          <MoneyText value={percentAmountInEventCurrency(event)} currency={event.currency} skelWidth={64} />
        </span>
      )
    }
    return <MoneyText value={Number(event.amount)} currency={event.currency} loading={loading} maskLength={5} skelWidth={72} />
  }

  function formatEventTitle(event: IncomeEvent): string {
    return event.asset ? `${event.asset.asset_name} · ${event.name}` : event.name
  }

  function formatEventMeta(event: IncomeEvent): string {
    const txType = event.asset
      ? getAssetTypeConfig(event.asset.asset_type).scheduledEvents.labels[event.transaction_type] ?? TRANSACTION_TYPE_LABELS[event.transaction_type] ?? event.transaction_type
      : TRANSACTION_TYPE_LABELS[event.transaction_type] ?? event.transaction_type
    const portfolio = event.asset?.portfolio?.name
    return portfolio ? `${txType} · ${portfolio}` : txType
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const activeIncome = events.filter((e) => e.is_active && e.transaction_type !== 'withdrawal')
  const totalAnnual = activeIncome.reduce((sum, e) => {
    const value = eventAmountValue(e)
    return value === null ? sum : sum + annualize(value, e.frequency)
  }, 0)
  const totalMonthly = totalAnnual / 12

  const nextEvent = activeIncome
    .map((e) => ({ event: e, next: nextOccurrenceDate(e) }))
    .filter((x) => x.next !== null)
    .sort((a, b) => a.next!.getTime() - b.next!.getTime())[0]

  const nextDateStr = nextEvent
    ? nextEvent.next!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
  const nextSub = nextEvent
    ? (
      <span>
        {formatEventTitle(nextEvent.event)} · {formatEventAmount(nextEvent.event)}
      </span>
    )
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
      <div className="stat-grid">
        <MiniStat
          label="Monthly (recurring)"
          value={<MoneyText value={totalMonthly} currency={selectedCurrency} loading={!isMounted || amountLoading} maskLength={6} skelWidth={110} skelHeight={22} />}
          sub={`${activeIncome.length} source${activeIncome.length !== 1 ? 's' : ''}`}
        />
        <MiniStat
          label="Annualized"
          value={<MoneyText value={totalAnnual} currency={selectedCurrency} loading={!isMounted || amountLoading} maskLength={6} skelWidth={120} skelHeight={22} />}
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
                        fontSize: 20, fontWeight: 500,
                      }}>
                        {currencySymbol(ev.asset?.currency ?? ev.currency)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {ev.asset_id ? (
                            <Link href={`/assets/${ev.asset_id}`} style={{ color: 'var(--accent)' }}>
                              {formatEventTitle(ev)}
                            </Link>
                          ) : formatEventTitle(ev)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>
                          {formatEventMeta(ev)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Cadence" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                    {INCOME_FREQUENCY_LABELS[ev.frequency]}
                  </td>
                  <td data-label="Amount" className="num" style={{ fontWeight: 600 }}>
                    {formatEventAmount(ev)}
                  </td>
                  <td data-label="Next" className="num" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                    {formatNextDate(ev)}
                  </td>
                  <td className="cell-actions">
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
