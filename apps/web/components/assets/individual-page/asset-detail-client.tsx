'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePrices } from '@/lib/hooks/use-prices'
import { useAssetAvgCost } from '@/lib/hooks/use-asset-avg-cost'
import { useAssetInfo } from '@/lib/hooks/use-asset-info'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { getAssetsViewState, normalizeAssetsPath } from '@/lib/assets-view-state'
import { formatPercent, resolveAssetPrice } from '@networth/utils'
import type { Asset, Portfolio, Transaction, ScheduledEvent } from '@networth/types'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { EditAssetDialog } from '../dialogs/edit-asset-dialog'
import { AssetDetailHeader } from './asset-detail-header'
import { ASSET_TYPE_COLOR } from './asset-detail-utils'
import { AssetHoldingsTab } from './asset-holdings-tab'
import { AssetNewsTab } from './asset-news-tab'
import { AssetNotesTab } from './asset-notes-tab'
import { AssetOverviewTab } from './asset-overview-tab'
import { AssetScheduledTab } from './asset-scheduled-tab'
import { AssetTransactionsTab } from './asset-transactions-tab'

type Tab = 'Overview' | 'Transactions' | 'Holdings' | 'News' | 'Scheduled' | 'Notes'

interface Props {
  asset: Asset
  transactions: Transaction[]
  scheduledEvents: ScheduledEvent[]
  portfolios: Portfolio[]
  userId: string
}

export function AssetDetailClient({ asset, transactions, scheduledEvents, portfolios, userId }: Props) {
  const router = useRouter()
  const { displayPrice, displayQuantity } = useAmountDisplay()
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
  const portfolio = portfolios.find((candidate) => candidate.id === asset.portfolio_id)
  const firstTx = transactions.length > 0 ? transactions[transactions.length - 1] : null
  const lastTx = transactions.length > 0 ? transactions[0] : null

  useEffect(() => {
    const cached = getAssetsViewState()
    if (!cached) return

    const path = normalizeAssetsPath(cached.path)
    if (path.startsWith('/portfolios/')) {
      const portfolioId = path.split('/')[2]
      if (!portfolios.some((candidate) => candidate.id === portfolioId)) return
      if (cached.selectedPortfolioId !== portfolioId) {
        setAssetsHref('/assets')
        return
      }
    }

    setAssetsHref(path)
  }, [portfolios])

  async function handleDeleteAsset() {
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

  async function handleDeleteEvent(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
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

  const tabs = [
    'Overview',
    ...(assetInfo?.holdings && assetInfo.holdings.length > 0 ? ['Holdings'] : []),
    'Transactions',
    'Scheduled',
    ...(assetInfo?.news && assetInfo.news.length > 0 ? ['News'] : []),
    'Notes',
  ] as Tab[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <AssetDetailHeader
        asset={asset}
        portfolio={portfolio}
        assetsHref={assetsHref}
        typeColor={typeColor}
        showMoreMenu={showMoreMenu}
        onToggleMoreMenu={() => setShowMoreMenu((value) => !value)}
        onCloseMoreMenu={() => setShowMoreMenu(false)}
        onAddTransaction={() => setShowAddTx(true)}
        onAddScheduledEvent={() => setShowAddEvent(true)}
        onEditAsset={() => { setShowMoreMenu(false); setShowEdit(true) }}
        onDeleteAsset={handleDeleteAsset}
      />

      {fxError && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'color-mix(in oklch, var(--warn) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--warn) 30%, transparent)', fontSize: 13, color: 'var(--warn)' }}>
          {fxError}
        </div>
      )}

      <div className="hero">
        <div className="hero-2col">
          <div>
            <div className="hero-label">
              <span className="hero-label-dot" />
              Market price · {asset.currency}
            </div>
            <div className="hero-big">
              {displayPrice(price, asset.currency, { loading, maskLength: 6 })}
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
              {displayPrice(marketValue, asset.currency, { loading, maskLength: 6 })}
            </div>
            {unrealized !== null && unrealizedPct !== null ? (
              <span className={`hero-delta ${unrealized < 0 ? 'neg' : ''}`}>
                {unrealized >= 0 ? '↑' : '↓'}
                {` ${displayPrice(Math.abs(unrealized), asset.currency)} · ${formatPercent(Math.abs(unrealizedPct))}`}
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
              {displayQuantity(quantity, { loading })}
            </div>
          </div>
          <div>
            <div className="hero-stat-k">Avg buy price</div>
            <div className="hero-stat-v">
              {displayPrice(avgCostBasis > 0 ? avgCostBasis : null, asset.currency, { loading })}
            </div>
          </div>
          <div>
            <div className="hero-stat-k">Cost basis</div>
            <div className="hero-stat-v">
              {displayPrice(costBasis > 0 ? costBasis : null, asset.currency, { loading, maskLength: 6 })}
            </div>
          </div>
          <div>
            <div className="hero-stat-k">Unrealized</div>
            <div className="hero-stat-v" style={{ color: unrealized !== null ? (unrealized >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined }}>
              {displayPrice(unrealized, asset.currency, { loading, withSign: true })}
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap" style={{ padding: 0 }}>
        <div className="tabs">
          {tabs.map((tabName) => (
            <button
              key={tabName}
              className={`tab-btn ${tab === tabName ? 'active' : ''}`}
              onClick={() => setTab(tabName)}
            >
              {tabName}
              {tabName === 'Transactions' && <span className="tab-chip">{transactions.length}</span>}
              {tabName === 'Scheduled' && <span className="tab-chip">{scheduledEvents.length}</span>}
            </button>
          ))}
        </div>

        <div style={{ padding: 'var(--density-pad-y) var(--density-pad-x)' }}>
          {tab === 'Overview' && (
            <AssetOverviewTab
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
              firstTx={firstTx}
              lastTx={lastTx}
              assetInfo={assetInfo}
            />
          )}
          {tab === 'Holdings' && assetInfo?.holdings && (
            <AssetHoldingsTab holdings={assetInfo.holdings} />
          )}
          {tab === 'Transactions' && (
            <AssetTransactionsTab
              transactions={transactions}
              asset={asset}
              onEdit={setEditingTx}
              onDelete={handleDeleteTx}
              onAdd={() => setShowAddTx(true)}
            />
          )}
          {tab === 'Scheduled' && (
            <AssetScheduledTab
              events={scheduledEvents}
              onEdit={setEditingEvent}
              onDelete={handleDeleteEvent}
              onAdd={() => setShowAddEvent(true)}
            />
          )}
          {tab === 'News' && assetInfo?.news && (
            <AssetNewsTab news={assetInfo.news} />
          )}
          {tab === 'Notes' && (
            <AssetNotesTab
              notes={notes}
              notesSaving={notesSaving}
              notesError={notesError}
              onChange={setNotes}
              onSave={handleSaveNotes}
            />
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
