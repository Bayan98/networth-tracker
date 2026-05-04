'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { formatCurrency, ASSET_TYPE_LABELS, resolveAssetPrice, PRICEABLE_TYPES } from '@networth/utils'
import { usePrices } from '@/lib/hooks/use-prices'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { usePortfolioHistory } from '@/lib/hooks/use-portfolio-history'
import { AssetsChart } from '@/components/assets/assets-chart'
import { AllocationCard } from '@/components/ui/allocation-card'
import type { Enriched } from '@/components/ui/allocation-card'
import { ASSET_TYPE_COLOR } from '@/lib/colors'
import type { Asset, Portfolio, Debt, CurrencyCode } from '@networth/types'
import type { Period } from '@/components/ui/area-chart'
import { AssetAvatar } from '@/components/ui/asset-avatar'

interface Props {
  assets: Asset[]
  portfolios: Portfolio[]
  debts: Debt[]
  quantityPerAsset: Record<string, number>
  currency: CurrencyCode
}

export function DashboardClient({ assets, portfolios, debts, quantityPerAsset, currency }: Props) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  const _hideAmounts = useAppStore((s) => s.hideAmounts)
  const _selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const hideAmounts = isMounted ? _hideAmounts : false
  const selectedCurrency = isMounted ? _selectedCurrency : currency

  const [period, setPeriod] = useState<Period>('1y')

  const priceItems = assets
    .filter((h) => h.symbol && PRICEABLE_TYPES.has(h.asset_type))
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices, currencies } = usePrices(priceItems)
  const { fx } = useTodayFx(assets, selectedCurrency)

  const { series, loading: histLoading, avgCostPerAsset, quantityPerAsset: hookQty } = usePortfolioHistory(assets, period, selectedCurrency)

  const enriched: Enriched[] = assets.map((asset) => {
    const { price: rawPrice, source } = resolveAssetPrice(asset, prices)
    const serverQty = quantityPerAsset[asset.id]
    const hookAssetQty = hookQty[asset.id]
    const qty = serverQty !== undefined ? serverQty : (hookAssetQty !== undefined ? hookAssetQty : 1)
    const price = source === 'cost_basis' ? (avgCostPerAsset[asset.id] ?? 0) : rawPrice
    const priceCcy = source === 'live' ? (currencies[asset.symbol?.toUpperCase() ?? ''] ?? 'USD') : asset.currency
    const rate = fx(priceCcy)
    const value: number | null = rate !== null && price > 0 ? qty * price * rate : null
    return { asset, value }
  })

  const totalValue = enriched.reduce<number | null>(
    (sum, e) => (sum !== null && e.value !== null ? sum + e.value : null),
    0,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <AssetsChart
        series={series}
        currency={selectedCurrency}
        loading={histLoading}
        period={period}
        onPeriodChange={setPeriod}
        totalValue={totalValue}
        hideAmounts={hideAmounts}
      />

      <div className="three-col">
        <AllocationCard defaultType="category" enriched={enriched} portfolios={portfolios} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} />
        <AllocationCard defaultType="portfolio" enriched={enriched} portfolios={portfolios} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} />
        <AllocationCard defaultType="currency" enriched={enriched} portfolios={portfolios} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} />
      </div>

      <div className="bottom-row">
        <TopPositions enriched={enriched} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} onAssetClick={(id) => router.push(`/assets/${id}`)} />
        <AllocationCard defaultType="assets" enriched={enriched} portfolios={portfolios} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} />
      </div>
    </div>
  )
}

function TopPositions({ enriched, hideAmounts, selectedCurrency, onAssetClick }: {
  enriched: Enriched[]
  hideAmounts: boolean
  selectedCurrency: CurrencyCode
  onAssetClick: (id: string) => void
}) {
  const sorted = [...enriched]
    .filter((e) => e.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8)

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Top positions</h3>
          <div className="sub">Sorted by value</div>
        </div>
        <Link href="/assets" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          View all →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sorted.map(({ asset, value }) => (
          <div
            key={asset.id}
            onClick={() => onAssetClick(asset.id)}
            style={{
              display: 'grid', gridTemplateColumns: '32px 1fr auto',
              alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'opacity .1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <AssetAvatar symbol={asset.symbol} assetType={asset.asset_type} name={asset.asset_name} size={32} borderRadius={8} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset.asset_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                {asset.symbol ?? ASSET_TYPE_LABELS[asset.asset_type]}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {hideAmounts ? '•••' : value !== null ? formatCurrency(value, selectedCurrency) : '—'}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', padding: '16px 0' }}>No assets yet.</p>
        )}
      </div>
    </div>
  )
}
