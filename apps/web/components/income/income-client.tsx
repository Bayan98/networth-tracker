'use client'

import { useMemo, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Sparkles, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { Asset, Portfolio, ScheduledEvent, CurrencyCode, IncomeFrequency } from '@networth/types'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'
import { usePortfolioValuation } from '@/lib/hooks/use-portfolio-valuation'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { getAssetTypeConfig } from '@/components/assets/asset-type-config'
import { MoneyText, MoneyTextWithDimFraction, LoadingText } from '@/components/ui/money-text'
import { Badge, Swatch, type RowTone } from '@/components/ui/tone-badge'
import { useSwipeRow } from '@/lib/hooks/use-swipe-row'

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

type SortKey = 'next' | 'amount-desc' | 'name' | 'asset-value'

const SORT_LABELS: Record<SortKey, string> = {
  'next':         'Next deposit',
  'amount-desc':  'Amount ↓',
  'asset-value':  'Asset value ↓',
  'name':         'A → Z',
}
const DEFAULT_SORT: SortKey = 'next'

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

function rowTone(ev: IncomeEvent): RowTone {
  if (!ev.is_active) return 'neutral'
  if (ev.transaction_type === 'withdrawal') return 'neg'
  if (ev.transaction_type === 'buy') return 'info'
  return 'pos'
}

function MiniStat({ label, value, sub, variant }: {
  label: string; value: ReactNode; sub: ReactNode; variant?: 'mono'
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-val ${variant === 'mono' ? 'mono' : ''}`} style={{ marginBottom: 6 }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  )
}

export function ScheduledEventsClient({ events, userId, currency }: Props) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT)
  const [sortOpen, setSortOpen] = useState(false)

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
          <span className="hide-mobile" style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>·</span>
          <span className="hide-mobile">
            <MoneyText value={percentAmountInEventCurrency(event)} currency={event.currency} skelWidth={64} />
          </span>
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
  const activeCount = activeIncome.length
  const pausedCount = events.filter((e) => !e.is_active).length

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sortedEvents = useMemo(() => {
    const arr = [...events]
    switch (sort) {
      case 'amount-desc':
        return arr.sort((a, b) => {
          const aV = eventAmountValue(a) ?? -Infinity
          const bV = eventAmountValue(b) ?? -Infinity
          return bV - aV
        })
      case 'name':
        return arr.sort((a, b) => formatEventTitle(a).localeCompare(formatEventTitle(b)))
      case 'asset-value':
        return arr.sort((a, b) => {
          const aV = a.asset_id ? (valueByAssetId[a.asset_id] ?? -Infinity) : -Infinity
          const bV = b.asset_id ? (valueByAssetId[b.asset_id] ?? -Infinity) : -Infinity
          return bV - aV
        })
      case 'next':
      default:
        return arr.sort((a, b) => {
          const aT = nextOccurrenceDate(a)?.getTime() ?? Number.POSITIVE_INFINITY
          const bT = nextOccurrenceDate(b)?.getTime() ?? Number.POSITIVE_INFINITY
          return aT - bT
        })
    }
  }, [events, sort, fx, valueByAssetId])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">Inflows · Cashflow calendar</div>
          <h1>Income streams.</h1>
          <p>Recurring and one-off sources feeding the net worth equation.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add source
        </button>
      </div>

      <div className="stat-grid">
        <MiniStat
          label="Monthly"
          variant="mono"
          value={<MoneyTextWithDimFraction value={totalMonthly} currency={selectedCurrency} loading={!isMounted || amountLoading} maskLength={6} skelWidth={110} skelHeight={22} />}
          sub={`${activeCount} active source${activeCount !== 1 ? 's' : ''}`}
        />
        <MiniStat
          label="Annualized"
          variant="mono"
          value={<MoneyTextWithDimFraction value={totalAnnual} currency={selectedCurrency} loading={!isMounted || amountLoading} maskLength={6} skelWidth={120} skelHeight={22} />}
          sub={<Badge tone="pos">Gross</Badge>}
        />
        <MiniStat
          label="Next deposit"
          variant="mono"
          value={nextDateStr}
          sub={nextSub}
        />
        <MiniStat
          label="Active sources"
          variant="mono"
          value={String(activeCount)}
          sub={pausedCount > 0 ? `${pausedCount} paused` : 'All running'}
        />
      </div>

      {events.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Sparkles size={20} />
          </div>
          <div className="empty-state-text">
            <h2>No income sources yet</h2>
            <p>
              Add a recurring source like salary, dividends, or interest to start
              tracking inflows against your net worth.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 6 }}>
            <Plus size={14} /> Add first source
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="ds-positions-head">
            <div style={{ minWidth: 0 }}>
              <h3>Income sources</h3>
              <p className="ds-positions-meta" style={{ margin: '6px 0 0' }}>
                {events.length} {events.length === 1 ? 'source' : 'sources'} · sorted by {SORT_LABELS[sort].toLowerCase()}
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setSortOpen((value) => !value)}
                className="iconbtn"
                aria-label="Sort"
                title={`Sort: ${SORT_LABELS[sort]}`}
                style={{
                  width: 34,
                  height: 34,
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  color: sort !== DEFAULT_SORT ? 'var(--accent)' : 'var(--ink-2)',
                }}
              >
                <SlidersHorizontal size={14} />
              </button>

              {sortOpen && (
                <div
                  style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 4,
                    zIndex: 50, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
                    padding: '4px 0', minWidth: 160,
                    background: 'var(--surface)', border: '1px solid var(--ink-3)',
                  }}
                  onMouseLeave={() => setSortOpen(false)}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSort(key); setSortOpen(false) }}
                      style={{
                        display: 'block', width: '100%', padding: '6px 14px',
                        textAlign: 'left', fontSize: 13, border: 'none',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        color: sort === key ? 'var(--accent)' : 'var(--ink)',
                        background: sort === key ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent',
                      } as React.CSSProperties}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                {sortedEvents.map((ev) => (
                  <IncomeRow
                    key={ev.id}
                    ev={ev}
                    tone={rowTone(ev)}
                    primaryTitle={ev.asset?.asset_name ?? ev.name}
                    secondaryTitle={ev.asset ? ev.name : null}
                    meta={formatEventMeta(ev)}
                    amount={formatEventAmount(ev)}
                    nextDate={formatNextDate(ev)}
                    cadenceLabel={INCOME_FREQUENCY_LABELS[ev.frequency]}
                    onEdit={() => setEditingEvent(ev)}
                    onDelete={() => handleDelete(ev.id)}
                  />
                ))}
              </tbody>
            </table>
        </div>
      )}

      {showAdd && (
        <AddScheduledEventDialog userId={userId} defaultCurrency={currency} onClose={() => setShowAdd(false)} />
      )}
      {editingEvent && (
        <EditScheduledEventDialog event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}
    </>
  )
}

interface IncomeRowProps {
  ev: IncomeEvent
  tone: RowTone
  primaryTitle: string
  secondaryTitle: string | null
  meta: string
  amount: ReactNode
  nextDate: string
  cadenceLabel: string
  onEdit: () => void
  onDelete: () => void
}

function IncomeRow({ ev, tone, primaryTitle, secondaryTitle, meta, amount, nextDate, cadenceLabel, onEdit, onDelete }: IncomeRowProps) {
  const swipe = useSwipeRow()
  const titleContent = (
    <>
      {primaryTitle}
      {secondaryTitle && (
        <span className="hide-mobile" style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>
          {' · '}{secondaryTitle}
        </span>
      )}
    </>
  )
  return (
    <tr style={swipe.style} {...swipe.handlers}>
      <td>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, minHeight: 32 }}>
          <Swatch tone={tone} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            justifyContent: 'center',
            minWidth: 0,
          }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
              {ev.asset_id ? (
                <Link href={`/assets/${ev.asset_id}`} style={{ color: 'inherit' }}>
                  {titleContent}
                </Link>
              ) : titleContent}
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--ink-faint)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.005em',
            }}>
              {meta}
            </div>
          </div>
        </div>
      </td>
      <td data-label="Cadence">
        <Badge tone={ev.is_active ? tone : 'neutral'}>
          {cadenceLabel}
        </Badge>
      </td>
      <td data-label="Amount" className="num" style={{ fontWeight: 600 }}>
        {amount}
      </td>
      <td data-label="Next" className="num" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
        <span>{nextDate}</span>
        <span className="show-mobile" style={{ color: 'var(--ink-muted)' }}>
          · {cadenceLabel}
        </span>
      </td>
      <td className="cell-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
          <button
            onClick={onEdit}
            className="iconbtn"
            style={{ width: 28, height: 28 }}
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="iconbtn"
            style={{ width: 28, height: 28, color: 'var(--neg)' }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}
