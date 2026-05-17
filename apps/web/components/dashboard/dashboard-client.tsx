'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { usePortfolioValuation } from '@/lib/hooks/use-portfolio-valuation'
import { DashboardChart } from '@/components/charts/dashboard-chart'
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

export function DashboardClient({ assets, portfolios, debts, quantityPerAsset, currency }: Props) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  const _selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const selectedCurrency = isMounted ? _selectedCurrency : currency

  const [period, setPeriod] = useState<Period>('1y')

  const { enriched, totalValue, liveSeries, chartLoading, periodIncome } = usePortfolioValuation(
    assets,
    period,
    selectedCurrency,
    {
      quantityOverrides: quantityPerAsset,
      missingQuantityFallback: 0,
      replaceLiveCostBasis: false,
    },
  )

  const pricedPositions = enriched.filter((item) => item.value !== null && item.value > 0).length
  const activePortfolios = new Set(assets.map((asset) => asset.portfolio_id).filter(Boolean)).size
  const activeCurrencies = new Set(assets.map((asset) => asset.currency)).size
  const activeDebts = debts.filter((debt) => debt.is_active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <DashboardChart
        series={liveSeries}
        currency={selectedCurrency}
        loading={chartLoading}
        period={period}
        onPeriodChange={setPeriod}
        totalValue={totalValue}
        periodIncome={periodIncome}
        height={420}
      />

      <div className="ledger-strip" aria-label="Overview summary">
        <div className="ledger-item">
          <span className="ledger-label">Positions</span>
          <strong className="ledger-value">{pricedPositions}</strong>
          <div className="ledger-note">{assets.length} tracked holding{assets.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="ledger-item">
          <span className="ledger-label">Portfolios</span>
          <strong className="ledger-value">{activePortfolios}</strong>
          <div className="ledger-note">{portfolios.length} account group{portfolios.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="ledger-item">
          <span className="ledger-label">Currencies</span>
          <strong className="ledger-value">{activeCurrencies}</strong>
          <div className="ledger-note">Viewed in {selectedCurrency}</div>
        </div>
        <div className="ledger-item">
          <span className="ledger-label">Liabilities</span>
          <strong className="ledger-value">{activeDebts}</strong>
          <div className="ledger-note">Active debt record{activeDebts !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="three-col">
        <AllocationCard defaultType="category" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
        <AllocationCard defaultType="portfolio" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
        <AllocationCard defaultType="currency" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
      </div>

      <div className="bottom-row">
        <TopPositions enriched={enriched} selectedCurrency={selectedCurrency} />
        <AllocationCard defaultType="assets" enriched={enriched} portfolios={portfolios} selectedCurrency={selectedCurrency} />
      </div>
    </div>
  )
}

function TopPositions({ enriched, selectedCurrency }: {
  enriched: Enriched[]
  selectedCurrency: CurrencyCode
}) {
  const { displayPrice } = useAmountDisplay()
  const sorted = [...enriched]
    .filter((e) => e.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8)

  return (
    <div className="table-wrap">
      <div className="ds-positions-head">
        <div>
          <h3>Top <em>positions</em></h3>
          <span className="ds-positions-meta">Sorted by value</span>
        </div>
        <Link href="/assets" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          View all
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '8px var(--density-pad-x)' }}>
        {sorted.map(({ asset, value }) => (
          <Link
            key={asset.id}
            href={`/assets/${asset.id}`}
            style={{
              display: 'grid', gridTemplateColumns: '32px 1fr auto',
              alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid var(--ink-3)',
              cursor: 'pointer', transition: 'opacity .1s',
              color: 'inherit', textDecoration: 'none',
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
          </Link>
        ))}
        {sorted.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', padding: '16px 0', margin: 0 }}>No assets yet.</p>
        )}
      </div>
    </div>
  )
}
