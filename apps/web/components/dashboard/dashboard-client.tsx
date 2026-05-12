'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { usePortfolioValuation } from '@/lib/hooks/use-portfolio-valuation'
import { PortfolioAreaChart } from '@/components/charts/portfolio-area-chart'
import { AllocationCard } from '@/components/ui/allocation-card'
import type { Enriched } from '@/components/ui/allocation-card'
import type { Asset, Portfolio, Debt, CurrencyCode } from '@networth/types'
import type { Period } from '@/components/charts/chart-utils'
import { AssetAvatar } from '@/components/ui/asset-avatar'

interface Props {
  assets: Asset[]
  portfolios: Portfolio[]
  debts: Debt[]
  quantityPerAsset: Record<string, number>
  currency: CurrencyCode
}

export function DashboardClient({ assets, portfolios, quantityPerAsset, currency }: Props) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  const _selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const selectedCurrency = isMounted ? _selectedCurrency : currency

  const [period, setPeriod] = useState<Period>('1y')

  const { enriched, totalValue, liveSeries, chartLoading } = usePortfolioValuation(
    assets,
    period,
    selectedCurrency,
    {
      quantityOverrides: quantityPerAsset,
      missingQuantityFallback: 0,
      replaceLiveCostBasis: false,
    },
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <PortfolioAreaChart
        series={liveSeries}
        currency={selectedCurrency}
        loading={chartLoading}
        period={period}
        onPeriodChange={setPeriod}
        totalValue={totalValue}
        height={420}
      />

      <div className="three-col">
        <AllocationCard defaultType="category" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
        <AllocationCard defaultType="portfolio" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
        <AllocationCard defaultType="currency" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
      </div>

      <div className="bottom-row">
        <TopPositions enriched={enriched} selectedCurrency={selectedCurrency} onAssetClick={(id) => router.push(`/assets/${id}`)} />
        <AllocationCard defaultType="assets" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
      </div>
    </div>
  )
}

function TopPositions({ enriched, selectedCurrency, onAssetClick }: {
  enriched: Enriched[]
  selectedCurrency: CurrencyCode
  onAssetClick: (id: string) => void
}) {
  const { displayPrice } = useAmountDisplay()
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
              {displayPrice(value, selectedCurrency)}
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
