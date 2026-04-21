'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePrices } from '@/lib/hooks/use-prices'
import { useAssetAvgCost } from '@/lib/hooks/use-asset-avg-cost'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatPercent, resolveAssetPrice, ASSET_TYPE_LABELS, INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { Asset, Portfolio, Transaction, ScheduledEvent, CurrencyCode } from '@networth/types'
import { EditAssetDialog } from './edit-asset-dialog'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'

const TX_TYPE_COLOR: Record<string, string> = {
  buy: 'var(--pos)',
  sell: 'var(--neg)',
  dividend: 'var(--cat-stocks)',
  deposit: 'var(--pos)',
  withdrawal: 'var(--neg)',
  split: 'var(--ink-muted)',
}

interface Props {
  asset: Asset
  transactions: Transaction[]
  scheduledEvents: ScheduledEvent[]
  portfolios: Portfolio[]
  userId: string
}

export function AssetDetailClient({ asset, transactions, scheduledEvents, portfolios, userId }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const [showEdit, setShowEdit] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

  const priceItems = asset.symbol ? [{ symbol: asset.symbol, asset_type: asset.asset_type }] : []
  const { prices } = usePrices(priceItems)
  const { price: rawPrice, source } = resolveAssetPrice(asset, prices)
  const { avgCostBasis, quantity, fx, loading, fxError } = useAssetAvgCost(transactions, asset.currency)

  const fxRate = source === 'live' ? fx('USD') : null
  const price: number | null = source === 'live'
    ? (fxRate !== null ? rawPrice * fxRate : null)
    : source === 'cost_basis' ? avgCostBasis : rawPrice

  const marketValueTotal = price !== null ? quantity * price : null
  const changeAbs = price !== null && avgCostBasis > 0 ? price - avgCostBasis : null
  const changePct = changeAbs !== null && avgCostBasis > 0 ? (changeAbs / avgCostBasis) * 100 : null
  const hasLiveData = source !== 'cost_basis'
  const changeColor = !hasLiveData || changePct === null ? undefined : changePct >= 0 ? 'var(--pos)' : 'var(--neg)'

  async function handleDelete() {
    if (!confirm(`Delete "${asset.asset_name}"? This will also delete all its transactions.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('assets').delete().eq('id', asset.id)
    if (!error) router.push('/assets')
  }

  async function handleDeleteTx(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) router.refresh()
  }

  async function handleDeleteEvent(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const stats = [
    { label: 'Quantity', value: hideAmounts ? '••••' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(quantity) },
    { label: 'Avg buy price', value: hideAmounts ? '••••' : loading ? '…' : formatCurrency(avgCostBasis, asset.currency) },
    {
      label: 'Market price',
      value: hideAmounts ? '••••' : loading ? '…' : price !== null ? formatCurrency(price, asset.currency) : '—',
      sub: source === 'live' ? 'live' : source === 'manual' ? 'manual' : 'est. from cost basis',
    },
    { label: 'Market value', value: hideAmounts ? '••••••' : loading ? '…' : marketValueTotal !== null ? formatCurrency(marketValueTotal, asset.currency) : '—' },
    {
      label: 'Gain / unit',
      value: hideAmounts ? '••••' : hasLiveData && changeAbs !== null ? formatCurrency(changeAbs, asset.currency) : '—',
      color: changeColor,
    },
    {
      label: 'Total return',
      value: hideAmounts ? '••••' : hasLiveData && changePct !== null ? formatPercent(changePct) : '—',
      color: changeColor,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      {/* Page head */}
      <div className="page-head">
        <div>
          <Link
            href="/assets"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}
          >
            <ChevronLeft size={12} />
            Assets
          </Link>
          <div className="empty-label">{ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}</div>
          <h1 style={{ marginTop: 4 }}>
            {asset.symbol ?? asset.asset_name}
            {asset.symbol && <> <em>{asset.asset_name}</em></>}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowEdit(true)} className="btn btn-secondary">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={handleDelete} className="btn btn-secondary" style={{ color: 'var(--neg)' }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      {fxError && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'color-mix(in oklch, var(--warn) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--warn) 30%, transparent)', fontSize: 13, color: 'var(--warn)' }}>
          {fxError}
        </div>
      )}
      <div className="asset-stats-grid">
        {stats.map(({ label, value, sub, color }) => (
          <div key={label} className="kpi">
            <div className="kpi-label">{label}</div>
            <div className="kpi-val" style={color ? { color, fontSize: 20 } : { fontSize: 20 }}>{value}</div>
            {sub && <div className="kpi-sub">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Scheduled events */}
      <div className="table-wrap">
        <div className="table-head">
          <h3>Scheduled events</h3>
          <button onClick={() => setShowAddEvent(true)} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 11px' }}>
            <Plus size={12} /> Add event
          </button>
        </div>
        {scheduledEvents.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p className="empty-label">No scheduled events</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th className="num">Amount</th>
                <th>Frequency</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scheduledEvents.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 500 }}>{ev.name}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{TRANSACTION_TYPE_LABELS[ev.transaction_type] ?? ev.transaction_type}</td>
                  <td className="num">
                    {hideAmounts ? '••••' : `${formatCurrency(Number(ev.amount), ev.currency)}${ev.amount_type === 'percent' ? '%' : ''}`}
                  </td>
                  <td style={{ color: 'var(--ink-muted)' }}>{INCOME_FREQUENCY_LABELS[ev.frequency]}</td>
                  <td>
                    <span className={`delta-pill ${ev.is_active ? 'pos' : ''}`} style={!ev.is_active ? { color: 'var(--ink-faint)', background: 'var(--surface-2)' } : undefined}>
                      {ev.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ width: 64, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingEvent(ev)} className="iconbtn" style={{ width: 28, height: 28 }} title="Edit">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="iconbtn" style={{ width: 28, height: 28, color: 'var(--neg)' }} title="Delete">
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

      {/* Transactions */}
      <div className="table-wrap">
        <div className="table-head">
          <h3>Transaction history</h3>
          <button onClick={() => setShowAddTx(true)} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 11px' }}>
            <Plus size={12} /> Add transaction
          </button>
        </div>
        {transactions.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p className="empty-label">No transactions recorded</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th className="num">Qty</th>
                <th className="num">Price</th>
                <th className="num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isCrossRate = tx.currency.toUpperCase() !== asset.currency.toUpperCase()
                const total = Number(tx.quantity) * Number(tx.price)
                return (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--ink-muted)' }}>
                      {new Date(tx.executed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: TX_TYPE_COLOR[tx.transaction_type] ?? 'inherit', textTransform: 'capitalize' }}>
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="num">{Number(tx.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className="num">
                      {formatCurrency(Number(tx.price), tx.currency)}
                      {isCrossRate && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ink-faint)' }}>{tx.currency}</span>}
                    </td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatCurrency(total, tx.currency)}</td>
                    <td style={{ width: 64, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingTx(tx)} className="iconbtn" style={{ width: 28, height: 28 }} title="Edit">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteTx(tx.id)} className="iconbtn" style={{ width: 28, height: 28, color: 'var(--neg)' }} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <EditAssetDialog asset={asset} portfolios={portfolios} onClose={() => setShowEdit(false)} />
      )}
      {showAddTx && (
        <AddTransactionDialog userId={userId} assetId={asset.id} assetCurrency={asset.currency} onClose={() => setShowAddTx(false)} />
      )}
      {editingTx && (
        <EditTransactionDialog transaction={editingTx} assetCurrency={asset.currency} onClose={() => setEditingTx(null)} />
      )}
      {showAddEvent && (
        <AddScheduledEventDialog userId={userId} assetId={asset.id} defaultCurrency={asset.currency} onClose={() => setShowAddEvent(false)} />
      )}
      {editingEvent && (
        <EditScheduledEventDialog event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}
    </div>
  )
}
