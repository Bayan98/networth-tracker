'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePrices } from '@/lib/hooks/use-prices'
import { useAssetAvgCost } from '@/lib/hooks/use-asset-avg-cost'
import { useAssetInfo } from '@/lib/hooks/use-asset-info'
import { useAppStore } from '@/lib/store'
import { getAssetsViewState, normalizeAssetsPath } from '@/lib/assets-view-state'
import {
  formatCurrency,
  formatPercent,
  resolveAssetPrice,
  ASSET_TYPE_LABELS,
  INCOME_FREQUENCY_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@networth/utils'
import type { Asset, Portfolio, Transaction, ScheduledEvent } from '@networth/types'
import { EditAssetDialog } from './edit-asset-dialog'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'
import { AssetAvatar } from '@/components/ui/asset-avatar'

const ASSET_TYPE_COLOR: Record<string, string> = {
  stock: 'var(--cat-stocks)',
  etf: 'var(--cat-stocks)',
  bond: 'var(--cat-stocks)',
  mutual_fund: 'var(--cat-stocks)',
  crypto: 'var(--cat-crypto)',
  cash: 'var(--cat-cash)',
  deposit: 'var(--cat-cash)',
  real_estate: 'var(--cat-real)',
  commodity: 'var(--cat-other)',
  business: 'var(--cat-other)',
  transport: 'var(--cat-other)',
  other: 'var(--cat-other)',
}

const TX_BG: Record<string, string> = {
  buy: 'color-mix(in oklch, var(--pos) 12%, transparent)',
  sell: 'color-mix(in oklch, var(--neg) 12%, transparent)',
  dividend: 'var(--surface-2)',
  deposit: 'color-mix(in oklch, var(--pos) 12%, transparent)',
  withdrawal: 'color-mix(in oklch, var(--neg) 12%, transparent)',
  split: 'var(--surface-2)',
}

const TX_INK: Record<string, string> = {
  buy: 'var(--pos)',
  sell: 'var(--neg)',
  dividend: 'var(--ink-2)',
  deposit: 'var(--pos)',
  withdrawal: 'var(--neg)',
  split: 'var(--ink-muted)',
}

type Tab = 'Overview' | 'Transactions' | 'Holdings' | 'News' | 'Scheduled' | 'Notes'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
  const [tab, setTab] = useState<Tab>('Overview')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [notes, setNotes] = useState(asset.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [showAddTx, setShowAddTx] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)
  const [assetsHref, setAssetsHref] = useState('/assets')

  const priceItems = asset.symbol ? [{ symbol: asset.symbol, asset_type: asset.asset_type }] : []
  const { prices, currencies } = usePrices(priceItems)
  const { price: rawPrice, source } = resolveAssetPrice(asset, prices)
  const { avgCostBasis, quantity, fx, loading, fxError } = useAssetAvgCost(transactions, asset.currency)
  const { info: assetInfo } = useAssetInfo(asset.symbol, asset.asset_type)

  const priceCcy = source === 'live' ? (currencies[asset.symbol?.toUpperCase() ?? ''] ?? 'USD') : asset.currency
  const fxRate = source === 'live' ? fx(priceCcy) : null
  const price: number | null = source === 'live'
    ? (fxRate !== null ? rawPrice * fxRate : null)
    : source === 'cost_basis' ? avgCostBasis : rawPrice

  const marketValue = price !== null ? quantity * price : null
  const costBasis = quantity * avgCostBasis
  const unrealized = marketValue !== null && costBasis > 0 ? marketValue - costBasis : null
  const unrealizedPct = unrealized !== null && costBasis > 0 ? (unrealized / costBasis) * 100 : null

  const typeColor = ASSET_TYPE_COLOR[asset.asset_type] ?? 'var(--cat-other)'
  const portfolio = portfolios.find((p) => p.id === asset.portfolio_id)
  const displaySymbol = asset.symbol ?? asset.asset_name.slice(0, 4).toUpperCase()

  const firstTx = transactions.length > 0 ? transactions[transactions.length - 1] : null
  const lastTx = transactions.length > 0 ? transactions[0] : null

  useEffect(() => {
    const cached = getAssetsViewState()
    if (!cached) return

    const path = normalizeAssetsPath(cached.path)
    if (path.startsWith('/portfolios/')) {
      const portfolioId = path.split('/')[2]
      if (!portfolios.some((p) => p.id === portfolioId)) return
      if (cached.selectedPortfolioId !== portfolioId) {
        setAssetsHref('/assets')
        return
      }
    }

    setAssetsHref(path)
  }, [portfolios])

  async function handleDelete() {
    if (!confirm(`Delete "${asset.asset_name}"? This will also delete all its transactions.`)) return
    setShowMoreMenu(false)
    const supabase = createClient()
    const { error } = await supabase.from('assets').delete().eq('id', asset.id)
    if (!error) router.push('/assets')
  }

  async function handleDeleteTx(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) router.refresh()
  }

  async function handleSaveNotes() {
    setNotesSaving(true)
    setNotesError(null)
    const supabase = createClient()
    const { error } = await supabase.from('assets').update({ notes: notes.trim() || null }).eq('id', asset.id)
    if (error) setNotesError(error.message)
    setNotesSaving(false)
  }

  async function handleDeleteEvent(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
    if (!error) router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted)' }}>
        <Link href={assetsHref} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, gap: 4 }}>
          ← Assets
        </Link>
        <span style={{ color: 'var(--ink-faint)' }}>/</span>
        <span>{asset.asset_name}</span>
      </div>

      {/* Header */}
      <div className="page-head" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, flexWrap: 'wrap' }}>
          <AssetAvatar
            symbol={asset.symbol}
            assetType={asset.asset_type}
            name={asset.asset_name}
            size={64}
            borderRadius={14}
            color={typeColor}
            fontSize={17}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 36px)' }}>{asset.asset_name}</h1>
              <span className="pill-ghost" style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-2)' }}>
                {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 4 }}>
              {[asset.symbol, portfolio?.name].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={() => setShowAddTx(true)}>
            <Plus size={13} /> Transaction
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAddEvent(true)}>
            <Calendar size={13} /> Schedule
          </button>
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowMoreMenu((v) => !v)}
            >
              <MoreVertical size={13} />
            </button>
            {showMoreMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  onClick={() => setShowMoreMenu(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
                  zIndex: 20, minWidth: 148, overflow: 'hidden',
                }}>
                  {[
                    { label: 'Edit asset', icon: <Pencil size={13} />, action: () => { setShowMoreMenu(false); setShowEdit(true) }, color: 'var(--ink)' },
                    { label: 'Delete asset', icon: <Trash2 size={13} />, action: handleDelete, color: 'var(--neg)' },
                  ].map(({ label, icon, action, color }) => (
                    <button
                      key={label}
                      onClick={action}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color, textAlign: 'left' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {fxError && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'color-mix(in oklch, var(--warn) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--warn) 30%, transparent)', fontSize: 13, color: 'var(--warn)' }}>
          {fxError}
        </div>
      )}

      {/* Hero */}
      <div className="hero">
        <div className="hero-2col">
          <div>
            <div className="hero-label">
              <span className="hero-label-dot" />
              Market price · {asset.currency}
            </div>
            <div className="hero-big">
              {hideAmounts ? '••••••' : loading ? '…' : price !== null ? formatCurrency(price, asset.currency) : '—'}
            </div>
            <span className="hero-delta neutral">
              {source === 'live' ? 'Today' : source === 'manual' ? 'manual' : 'est. from cost basis'}
            </span>
          </div>
          <div>
            <div className="hero-label">
              <span className="hero-label-dot" style={{ background: 'var(--ink-faint)' }} />
              Your position
            </div>
            <div className="hero-big">
              {hideAmounts ? '••••••' : loading ? '…' : marketValue !== null ? formatCurrency(marketValue, asset.currency) : '—'}
            </div>
            {unrealized !== null && unrealizedPct !== null ? (
              <span className={`hero-delta ${unrealized < 0 ? 'neg' : ''}`}>
                {unrealized >= 0 ? '↑' : '↓'}
                {hideAmounts ? ' •••' : ` ${formatCurrency(Math.abs(unrealized), asset.currency)} · ${formatPercent(Math.abs(unrealizedPct))}`}
              </span>
            ) : (
              <span className="hero-delta neutral">no cost basis yet</span>
            )}
          </div>
        </div>

        <div className="hero-stats">
          <div>
            <div className="hero-stat-k">Quantity</div>
            <div className="hero-stat-v">
              {hideAmounts ? '••••' : loading ? '…' : quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </div>
          </div>
          <div>
            <div className="hero-stat-k">Avg buy price</div>
            <div className="hero-stat-v">
              {hideAmounts ? '•••' : loading ? '…' : avgCostBasis > 0 ? formatCurrency(avgCostBasis, asset.currency) : '—'}
            </div>
          </div>
          <div>
            <div className="hero-stat-k">Cost basis</div>
            <div className="hero-stat-v">
              {hideAmounts ? '••••••' : loading ? '…' : costBasis > 0 ? formatCurrency(costBasis, asset.currency) : '—'}
            </div>
          </div>
          <div>
            <div className="hero-stat-k">Unrealized</div>
            <div className="hero-stat-v" style={{ color: unrealized !== null ? (unrealized >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined }}>
              {hideAmounts ? '•••' : loading ? '…' : unrealized !== null
                ? (unrealized >= 0 ? '+' : '') + formatCurrency(unrealized, asset.currency)
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed card */}
      <div className="table-wrap" style={{ padding: 0 }}>
        <div className="tabs">
          {(([
            'Overview',
            ...(assetInfo?.holdings && assetInfo.holdings.length > 0 ? ['Holdings'] : []),
            'Transactions',
            'Scheduled',
            ...(assetInfo?.news && assetInfo.news.length > 0 ? ['News'] : []),
            'Notes',
          ]) as Tab[]).map((t) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'Transactions' && <span className="tab-chip">{transactions.length}</span>}
              {t === 'Scheduled' && <span className="tab-chip">{scheduledEvents.length}</span>}
            </button>
          ))}
        </div>

        <div style={{ padding: 'var(--density-pad-y) var(--density-pad-x)' }}>
          {tab === 'Overview' && (
            <OverviewTab
              asset={asset}
              price={price}
              avgCostBasis={avgCostBasis}
              costBasis={costBasis}
              marketValue={marketValue}
              unrealized={unrealized}
              unrealizedPct={unrealizedPct}
              quantity={quantity}
              source={source}
              portfolio={portfolio}
              loading={loading}
              hideAmounts={hideAmounts}
              firstTx={firstTx}
              lastTx={lastTx}
              assetInfo={assetInfo}
            />
          )}
          {tab === 'Holdings' && assetInfo?.holdings && (
            <HoldingsTab holdings={assetInfo.holdings} />
          )}
          {tab === 'Transactions' && (
            <TransactionsTab
              transactions={transactions}
              asset={asset}
              hideAmounts={hideAmounts}
              onEdit={setEditingTx}
              onDelete={handleDeleteTx}
              onAdd={() => setShowAddTx(true)}
            />
          )}
          {tab === 'Scheduled' && (
            <ScheduledTab
              events={scheduledEvents}
              onEdit={setEditingEvent}
              onDelete={handleDeleteEvent}
              onAdd={() => setShowAddEvent(true)}
              hideAmounts={hideAmounts}
            />
          )}
          {tab === 'News' && assetInfo?.news && (
            <NewsTab news={assetInfo.news} />
          )}
          {tab === 'Notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your notes, thesis, reminders…"
                style={{
                  width: '100%', minHeight: 220, padding: '16px 18px',
                  background: 'var(--bg-sunken)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', resize: 'vertical',
                  fontSize: 14, lineHeight: 1.7, color: 'var(--ink)',
                  fontFamily: 'var(--font-sans)', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                {notesError && <p style={{ fontSize: 12, color: 'var(--neg)' }}>{notesError}</p>}
                <button
                  className="btn btn-secondary"
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  style={{ opacity: notesSaving ? 0.6 : 1 }}
                >
                  {notesSaving ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEdit && <EditAssetDialog asset={asset} portfolios={portfolios} onClose={() => setShowEdit(false)} />}
      {showAddTx && <AddTransactionDialog userId={userId} assetId={asset.id} assetCurrency={asset.currency} assetSymbol={asset.symbol} assetType={asset.asset_type} onClose={() => setShowAddTx(false)} />}
      {editingTx && <EditTransactionDialog transaction={editingTx} assetCurrency={asset.currency} onClose={() => setEditingTx(null)} />}
      {showAddEvent && <AddScheduledEventDialog userId={userId} assetId={asset.id} defaultCurrency={asset.currency} onClose={() => setShowAddEvent(false)} />}
      {editingEvent && <EditScheduledEventDialog event={editingEvent} onClose={() => setEditingEvent(null)} />}
    </div>
  )
}

function OverviewTab({
  asset, price, avgCostBasis, costBasis, marketValue, unrealized, unrealizedPct,
  quantity, source, portfolio, loading, hideAmounts, firstTx, lastTx, assetInfo,
}: {
  asset: Asset
  price: number | null
  avgCostBasis: number
  costBasis: number
  marketValue: number | null
  unrealized: number | null
  unrealizedPct: number | null
  quantity: number
  source: string
  portfolio: Portfolio | undefined
  loading: boolean
  hideAmounts: boolean
  firstTx: Transaction | null
  lastTx: Transaction | null
  assetInfo: import('@/lib/hooks/use-asset-info').AssetInfo | null
}) {
  const priceUrl = source === 'live' && asset.symbol ? (() => {
    if (asset.asset_type === 'crypto') return `https://finance.yahoo.com/quote/${asset.symbol}-USD/`
    const colonIdx = asset.symbol.indexOf(':')
    if (colonIdx > 0) {
      const exchange = asset.symbol.slice(0, colonIdx).toLowerCase()
      const ticker = asset.symbol.slice(colonIdx + 1).toLowerCase()
      return `https://stockanalysis.com/quote/${exchange}/${ticker}/`
    }
    if (asset.asset_type === 'etf') return `https://stockanalysis.com/etf/${asset.symbol.toLowerCase()}/`
    return `https://finance.yahoo.com/quote/${asset.symbol}/`
  })() : null

  const analystColor = assetInfo?.analystRating
    ? assetInfo.analystRating.includes('Buy') ? 'var(--pos)'
      : assetInfo.analystRating.includes('Sell') ? 'var(--neg)'
      : 'var(--ink-2)'
    : undefined

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="overview-cols">
      <div>
        <div className="empty-label" style={{ marginBottom: 12 }}>Market</div>
        <div>
          <StatRow k="Symbol" v={asset.symbol ?? '—'} />
          <StatRow k="Price" v={hideAmounts ? '•••' : loading ? '…' : price !== null ? formatCurrency(price, asset.currency) : '—'} />
          {source === 'live' && priceUrl ? (
            <div className="stat-row">
              <span className="stat-key">Source</span>
              <a href={priceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                Live price <ExternalLink size={11} />
              </a>
            </div>
          ) : (
            <StatRow k="Source" v={source === 'manual' ? 'Manual' : 'Est. from cost'} />
          )}
          <StatRow k="Currency" v={asset.currency} />
          <StatRow k="Type" v={ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type} />
          <StatRow k="Portfolio" v={portfolio?.name ?? 'Unassigned'} />
          {assetInfo?.sector && <StatRow k="Sector" v={assetInfo.sector} />}
          {assetInfo?.country && <StatRow k="Country" v={assetInfo.country} />}
          {assetInfo?.pe != null && <StatRow k="P/E" v={assetInfo.pe.toFixed(1) + 'x'} />}
          {assetInfo?.eps != null && <StatRow k="EPS" v={formatCurrency(assetInfo.eps, asset.currency)} />}
          {assetInfo?.beta != null && <StatRow k="Beta" v={assetInfo.beta.toFixed(2)} />}
          {assetInfo?.dividend && <StatRow k="Dividend" v={assetInfo.dividend} />}
          {assetInfo?.analystRating && (
            <StatRow
              k="Analyst"
              v={assetInfo.analystRating + (assetInfo.analystCount ? ` (${assetInfo.analystCount})` : '')}
              color={analystColor}
            />
          )}
          {assetInfo?.description && (
            <div className="stat-row" style={{ alignItems: 'flex-start' }}>
              <span className="stat-key">About</span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 320 }}>{assetInfo.description}</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="empty-label" style={{ marginBottom: 12 }}>Position</div>
        <div>
          <StatRow k="Quantity" v={hideAmounts ? '••••' : loading ? '…' : quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} />
          <StatRow k="Avg cost" v={hideAmounts ? '•••' : loading ? '…' : avgCostBasis > 0 ? formatCurrency(avgCostBasis, asset.currency) : '—'} />
          <StatRow k="Total cost" v={hideAmounts ? '••••••' : loading ? '…' : costBasis > 0 ? formatCurrency(costBasis, asset.currency) : '—'} />
          <StatRow k="Market value" v={hideAmounts ? '••••••' : loading ? '…' : marketValue !== null ? formatCurrency(marketValue, asset.currency) : '—'} />
          <StatRow
            k="Unrealized"
            v={hideAmounts ? '•••' : loading ? '…' : unrealized !== null ? (unrealized >= 0 ? '+' : '') + formatCurrency(unrealized, asset.currency) : '—'}
            color={unrealized !== null ? (unrealized >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined}
          />
          <StatRow k="Return %" v={hideAmounts ? '•••' : loading ? '…' : unrealizedPct !== null ? formatPercent(unrealizedPct) : '—'}
            color={unrealizedPct !== null ? (unrealizedPct >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined}
          />
          <StatRow k="First bought" v={firstTx ? fmtDate(firstTx.executed_at) : '—'} />
          <StatRow k="Last activity" v={lastTx ? fmtDate(lastTx.executed_at) : '—'} />
        </div>
      </div>
      <style>{`@media (max-width: 640px) { .overview-cols { grid-template-columns: 1fr !important; gap: 24px !important; } }`}</style>
    </div>
  )
}

function HoldingsTab({ holdings }: { holdings: import('@/lib/hooks/use-asset-info').Holding[] }) {
  const total = holdings.reduce((sum, h) => sum + h.pct, 0)
  return (
    <div>
      <div className="empty-label" style={{ marginBottom: 12 }}>ETF Holdings</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Symbol</th>
            <th style={thStyle}>Name</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Weight</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={h.symbol || i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                {h.symbol || '—'}
              </td>
              <td style={{ ...tdStyle, color: 'var(--ink-2)' }}>{h.name}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (h.pct / (total || 1)) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 40, textAlign: 'right' }}>
                    {(h.pct * 100).toFixed(2)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NewsTab({ news }: { news: import('@/lib/hooks/use-asset-info').NewsItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {news.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: '14px 0',
            borderBottom: i < news.length - 1 ? '1px solid var(--border)' : 'none',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 4, lineHeight: 1.4 }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-faint)', alignItems: 'center' }}>
            <span>{item.publisher}</span>
            <span>·</span>
            <span>{new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <ExternalLink size={10} style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }} />
          </div>
        </a>
      ))}
    </div>
  )
}

function StatRow({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="stat-row">
      <span className="stat-key">{k}</span>
      <span className="stat-val" style={color ? { color } : undefined}>{v}</span>
    </div>
  )
}

function TransactionsTab({
  transactions, asset, hideAmounts, onEdit, onDelete, onAdd,
}: {
  transactions: Transaction[]
  asset: Asset
  hideAmounts: boolean
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  onAdd: () => void
}) {
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
    <div style={{ margin: '0 -4px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Note</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
            <th style={thStyle} />
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const total = Number(tx.quantity) * Number(tx.price)
            const isCredit = tx.transaction_type === 'sell' || tx.transaction_type === 'withdrawal'
            const isCrossRate = tx.currency.toUpperCase() !== asset.currency.toUpperCase()
            return (
              <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 999,
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    border: '1px solid var(--border)',
                    background: TX_BG[tx.transaction_type] ?? 'var(--surface-2)',
                    color: TX_INK[tx.transaction_type] ?? 'var(--ink-2)',
                  }}>
                    {TRANSACTION_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {fmtDate(tx.executed_at)}
                </td>
                <td style={{ ...tdStyle, color: 'var(--ink-2)' }}>{tx.notes ?? '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {Number(tx.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {formatCurrency(Number(tx.price), tx.currency)}
                  {isCrossRate && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--ink-faint)' }}>{tx.currency}</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: isCredit ? 'var(--neg)' : 'var(--ink)' }}>
                  {hideAmounts ? '•••' : (isCredit ? '-' : '') + formatCurrency(Math.abs(total), tx.currency)}
                </td>
                <td style={{ ...tdStyle, width: 60, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button className="iconbtn" style={{ width: 28, height: 28 }} onClick={() => onEdit(tx)} title="Edit">
                      <Pencil size={12} />
                    </button>
                    <button className="iconbtn" style={{ width: 28, height: 28, color: 'var(--neg)' }} onClick={() => onDelete(tx.id)} title="Delete">
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

function ScheduledTab({
  events, onEdit, onDelete, onAdd, hideAmounts,
}: {
  events: ScheduledEvent[]
  onEdit: (ev: ScheduledEvent) => void
  onDelete: (id: string) => void
  onAdd: () => void
  hideAmounts: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
      {events.map((ev) => (
        <div key={ev.id} style={{
          padding: '16px 18px', borderRadius: 'var(--radius)',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {TRANSACTION_TYPE_LABELS[ev.transaction_type] ?? ev.transaction_type} · {INCOME_FREQUENCY_LABELS[ev.frequency] ?? ev.frequency}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                padding: '2px 7px', borderRadius: 999, fontSize: 10,
                background: ev.is_active ? 'color-mix(in oklch, var(--pos) 12%, transparent)' : 'var(--bg)',
                border: '1px solid var(--border)',
                color: ev.is_active ? 'var(--pos)' : 'var(--ink-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                {ev.is_active ? 'active' : 'inactive'}
              </span>
              <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => onEdit(ev)} title="Edit"><Pencil size={11} /></button>
              <button className="iconbtn" style={{ width: 26, height: 26, color: 'var(--neg)' }} onClick={() => onDelete(ev.id)} title="Delete"><Trash2 size={11} /></button>
            </div>
          </div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>
            {hideAmounts ? '••••' : formatCurrency(Number(ev.amount), ev.currency)}
            {ev.amount_type === 'percent' && '%'}
          </div>
        </div>
      ))}
      <button
        onClick={onAdd}
        style={{
          padding: '16px 18px', borderRadius: 'var(--radius)',
          background: 'transparent', border: '1px dashed var(--border-strong)',
          color: 'var(--ink-muted)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          minHeight: 100, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}
      >
        <Plus size={14} /> Add scheduled event
      </button>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 6px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--ink-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  background: 'var(--bg-sunken)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 6px',
  fontSize: 13,
  verticalAlign: 'middle',
}
