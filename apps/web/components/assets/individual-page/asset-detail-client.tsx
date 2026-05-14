'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePrices } from '@/lib/hooks/use-prices'
import { useAssetAvgCost } from '@/lib/hooks/use-asset-avg-cost'
import { useAssetInfo } from '@/lib/hooks/use-asset-info'
import { useAssetNews } from '@/lib/hooks/use-asset-news'
import { getAssetsViewState, normalizeAssetsPath } from '@/lib/assets-view-state'
import { resolveAssetPrice } from '@networth/utils'
import type { Asset, Portfolio, Transaction, ScheduledEvent } from '@networth/types'
import { AddScheduledEventDialog } from '@/components/scheduled-events/add-scheduled-event-dialog'
import { EditScheduledEventDialog } from '@/components/scheduled-events/edit-scheduled-event-dialog'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { getAssetTypeConfig } from '../asset-type-config'
import { EditAssetDialog } from '../dialogs/edit-asset-dialog'
import { AssetDetailHeader } from './asset-detail-header'
import { ASSET_TYPE_COLOR } from './asset-detail-utils'
import { AssetNewsTab } from './asset-news-tab'
import { AssetNotesTab } from './asset-notes-tab'
import { AssetOverviewTab } from './asset-overview-tab'
import { AssetScheduledTab } from './asset-scheduled-tab'
import { AssetTransactionsTab } from './asset-transactions-tab'
import { MoneyText, QuantityText } from '@/components/ui/money-text'

type Tab = 'Overview' | 'Transactions' | 'News' | 'Scheduled' | 'Notes'

interface Props {
  asset: Asset
  transactions: Transaction[]
  scheduledEvents: ScheduledEvent[]
  portfolios: Portfolio[]
  userId: string
}

export function AssetDetailClient({ asset, transactions, scheduledEvents, portfolios, userId }: Props) {
  const router = useRouter()
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
  const { avgCostBasis, quantity, totalIncome, dividendIncome, sellIncome, fx, loading, fxError } = useAssetAvgCost(transactions, asset.currency)
  const { info: assetInfo, loading: assetInfoLoading } = useAssetInfo(asset.symbol, asset.asset_type)
  const { news: assetNews, loading: newsLoading } = useAssetNews(asset.symbol, asset.asset_type, asset.asset_name, tab === 'News')
  const assetConfig = getAssetTypeConfig(asset.asset_type)

  const priceCcy = source === 'live' ? (currencies[asset.symbol?.toUpperCase() ?? ''] ?? 'USD') : asset.currency
  const fxRate = source === 'live' ? fx(priceCcy) : null
  const price: number | null = source === 'live'
    ? (fxRate !== null ? rawPrice * fxRate : null)
    : source === 'cost_basis' ? avgCostBasis : rawPrice

  const marketValue = price !== null ? quantity * price : null
  const costBasis = quantity * avgCostBasis
  const typeColor = ASSET_TYPE_COLOR[asset.asset_type] ?? 'var(--cat-other)'
  const portfolio = portfolios.find((candidate) => candidate.id === asset.portfolio_id)
  const showQuantity = assetConfig.transactions.showQuantity
  const showMarketUnit = showQuantity && quantity > 1
  const showCostBasisRow = source !== 'cost_basis'
  const showIncomeRow = totalIncome !== 0
  const incomeLabel = assetConfig.scheduledEvents.labels.dividend ?? assetConfig.transactions.labels.dividend ?? 'Dividend'

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
    'Transactions',
    'Scheduled',
    ...(asset.symbol ? ['News'] : []),
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
        <div className="asset-summary-rows">
          <div className={`asset-summary-row ${showMarketUnit ? '' : 'single'}`}>
            <SummaryMetric label={`Total market value · ${asset.currency}`} primary>
              <MoneyText value={marketValue} currency={asset.currency} loading={loading} maskLength={6} skelWidth={180} skelHeight={32} />
            </SummaryMetric>
            {showMarketUnit && (
              <>
                <SummaryMetric label="Quantity">
                  <QuantityText value={quantity} loading={loading} />
                </SummaryMetric>
                <SummaryMetric label="Market price">
                  <MoneyText value={price} currency={asset.currency} loading={loading} />
                </SummaryMetric>
              </>
            )}
          </div>

          {showCostBasisRow && (
            <div className={`asset-summary-row ${showQuantity ? '' : 'two-col'}`}>
              <SummaryMetric label={`Total value · ${asset.currency}`} primary>
                <MoneyText value={costBasis > 0 ? costBasis : null} currency={asset.currency} loading={loading} maskLength={6} skelWidth={180} skelHeight={32} />
              </SummaryMetric>
              {showQuantity && (
                <SummaryMetric label="Quantity">
                  <QuantityText value={quantity} loading={loading} />
                </SummaryMetric>
              )}
              <SummaryMetric label="Avg buy price">
                <MoneyText value={avgCostBasis > 0 ? avgCostBasis : null} currency={asset.currency} loading={loading} />
              </SummaryMetric>
            </div>
          )}

          {showIncomeRow && (
            <div className="asset-summary-row">
              <SummaryMetric label={`Income · ${asset.currency}`} primary color={totalIncome > 0 ? 'var(--pos)' : 'var(--neg)'}>
                <MoneyText value={totalIncome} currency={asset.currency} loading={loading} withSign maskLength={6} skelWidth={180} skelHeight={32} />
              </SummaryMetric>
              <SummaryMetric label={incomeLabel} color={dividendIncome > 0 ? 'var(--pos)' : dividendIncome < 0 ? 'var(--neg)' : undefined}>
                <MoneyText value={dividendIncome} currency={asset.currency} loading={loading} withSign />
              </SummaryMetric>
              <SummaryMetric label="Sell" color={sellIncome > 0 ? 'var(--pos)' : sellIncome < 0 ? 'var(--neg)' : undefined}>
                <MoneyText value={sellIncome} currency={asset.currency} loading={loading} withSign />
              </SummaryMetric>
            </div>
          )}
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
              loading={assetInfoLoading}
              assetInfo={assetInfo}
            />
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
              assetType={asset.asset_type}
              onEdit={setEditingEvent}
              onDelete={handleDeleteEvent}
              onAdd={() => setShowAddEvent(true)}
            />
          )}
          {tab === 'News' && (
            newsLoading ? (
              <div className="empty-label">Loading news…</div>
            ) : assetNews?.length ? (
              <AssetNewsTab news={assetNews} />
            ) : (
              <div className="empty-label">No recent news available</div>
            )
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
      {editingTx && <EditTransactionDialog transaction={editingTx} assetCurrency={asset.currency} assetSymbol={asset.symbol} assetType={asset.asset_type} onClose={() => setEditingTx(null)} />}
      {showAddEvent && <AddScheduledEventDialog userId={userId} assetId={asset.id} assetType={asset.asset_type} defaultCurrency={asset.currency} onClose={() => setShowAddEvent(false)} />}
      {editingEvent && <EditScheduledEventDialog event={editingEvent} assetType={asset.asset_type} onClose={() => setEditingEvent(null)} />}
    </div>
  )
}

function SummaryMetric({
  label,
  children,
  color,
  primary = false,
}: {
  label: string
  children: ReactNode
  color?: string
  primary?: boolean
}) {
  return (
    <div className={`asset-summary-metric ${primary ? 'primary' : ''}`}>
      <div className="asset-summary-label">{label}</div>
      <div className="asset-summary-value" style={color ? { color } : undefined}>{children}</div>
    </div>
  )
}
