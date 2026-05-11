'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { formatPercent } from '@networth/utils'
import type { Portfolio, Asset, CurrencyCode, AssetType } from '@networth/types'
import { usePortfolioValuation } from '@/lib/hooks/use-portfolio-valuation'
import { getAssetsViewState, setAssetsViewState } from '@/lib/assets-view-state'
import type { Period } from '@/components/charts/chart-utils'
import { AddAssetDialog } from '../dialogs/add-asset-dialog'
import { AssetTypeFilter } from './asset-type-filter'
import { AssetsPageHeader } from './assets-page-header'
import { HoldingsList } from './holdings-list'
import { PortfolioClient } from './portfolio-selector'
import { PortfolioPerformance } from './portfolio-performance'
import { PortfolioStats } from './portfolio-stats'

interface Props {
  portfolios: Portfolio[]
  assets: Asset[]
  currency: CurrencyCode
  userId: string
  initialPortfolioId?: string | null
  portfolioName?: string
}

export function AssetsClient({ portfolios, assets, currency, userId, initialPortfolioId, portfolioName }: Props) {
  const router = useRouter()
  const { displayPrice } = useAmountDisplay()
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const setSelectedCurrency = useAppStore((s) => s.setSelectedCurrency)

  const currencyInitRef = useRef(false)
  useEffect(() => {
    if (!currencyInitRef.current) {
      currencyInitRef.current = true
      if (selectedCurrency === 'USD' && currency !== 'USD') setSelectedCurrency(currency)
    }
  }, [])

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(initialPortfolioId ?? null)
  const [selectedTypes, setSelectedTypes] = useState<Set<AssetType>>(new Set())
  const [period, setPeriod] = useState<Period>('1w')
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [cacheReady, setCacheReady] = useState(false)

  const byPortfolio = selectedPortfolioId
    ? assets.filter((asset) => asset.portfolio_id === selectedPortfolioId)
    : assets

  const visible = selectedTypes.size > 0
    ? byPortfolio.filter((asset) => selectedTypes.has(asset.asset_type as AssetType))
    : byPortfolio

  const allTypes = Array.from(new Set(byPortfolio.map((asset) => asset.asset_type))) as AssetType[]
  const assetsViewPath = selectedPortfolioId ? `/portfolios/${selectedPortfolioId}` : '/assets'

  const {
    valuations,
    liveSeries,
    totalValue,
    totalCostBasis,
    totalGainPct,
    periodChangeAbs,
    periodChangePct,
    todayChangeAbs,
    todayChangePct,
    loading: baseLoading,
    chartLoading,
    fxError,
    priceError,
  } = usePortfolioValuation(visible, period, selectedCurrency, { priceAssets: assets })

  useEffect(() => {
    const cached = getAssetsViewState()
    if (!cached) {
      setCacheReady(true)
      return
    }

    const nextPortfolioId = initialPortfolioId !== undefined ? initialPortfolioId : null
    const assetsForPortfolio = nextPortfolioId
      ? assets.filter((asset) => asset.portfolio_id === nextPortfolioId)
      : assets
    const validTypes = new Set(assetsForPortfolio.map((asset) => asset.asset_type))
    const nextTypes = cached.selectedTypes.filter((type) => validTypes.has(type))

    setSelectedPortfolioId(nextPortfolioId ?? null)
    setSelectedTypes(new Set(nextTypes))
    if (cached.period) setPeriod(cached.period)
    setCacheReady(true)
  }, [assets, initialPortfolioId, portfolios])

  useEffect(() => {
    if (!cacheReady) return
    setAssetsViewState({
      path: assetsViewPath,
      selectedPortfolioId,
      selectedTypes: Array.from(selectedTypes),
      period,
    })
  }, [assetsViewPath, cacheReady, period, selectedPortfolioId, selectedTypes])

  const portfolioMap = useMemo(
    () => Object.fromEntries(portfolios.map((portfolio) => [portfolio.id, portfolio.name])),
    [portfolios],
  )
  const portfolioCount = new Set(visible.map((asset) => asset.portfolio_id).filter(Boolean)).size

  function saveCurrentView() {
    setAssetsViewState({
      path: assetsViewPath,
      selectedPortfolioId,
      selectedTypes: Array.from(selectedTypes),
      period,
    })
  }

  function handlePortfolioSelect(id: string | null) {
    setSelectedPortfolioId(id)
    setSelectedTypes(new Set())
    setAssetsViewState({
      path: id ? `/portfolios/${id}` : '/assets',
      selectedPortfolioId: id,
      selectedTypes: [],
      period,
    })
    router.push(id ? `/portfolios/${id}` : '/assets')
  }

  function toggleType(type: AssetType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function openAsset(assetId: string) {
    saveCurrentView()
    window.location.href = `/assets/${assetId}`
  }

  const fmt = (value: number | null, withSign = false, loading = baseLoading) => {
    return displayPrice(value, selectedCurrency, { loading, loadingText: '—', withSign })
  }
  const fmtPct = (value: number | null, loading = baseLoading) => {
    if (loading || value === null) return '—'
    return formatPercent(value)
  }

  return (
    <>
      <AssetsPageHeader
        portfolioName={portfolioName}
        holdingCount={visible.length}
        portfolioCount={portfolioCount}
        onAddAsset={() => setShowAddAsset(true)}
      />

      {(fxError || priceError) && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'color-mix(in oklch, var(--warn) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--warn) 30%, transparent)', fontSize: 13, color: 'var(--warn)' }}>
          {fxError && <p>{fxError}</p>}
          {priceError && <p>{priceError}</p>}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <AssetTypeFilter allTypes={allTypes} selectedTypes={selectedTypes} onToggle={toggleType} />
        <PortfolioClient
          portfolios={portfolios}
          selectedId={selectedPortfolioId}
          onSelect={handlePortfolioSelect}
          userId={userId}
        />
      </div>

      <PortfolioStats
        totalValue={fmt(totalValue)}
        totalGainPct={fmtPct(totalGainPct)}
        totalGainTrend={totalGainPct !== null ? (totalGainPct >= 0 ? 'pos' : 'neg') : undefined}
        totalCostBasis={fmt(totalCostBasis)}
        periodChange={fmt(periodChangeAbs, true, chartLoading)}
        periodChangePct={fmtPct(periodChangePct, chartLoading)}
        periodTrend={!chartLoading && periodChangeAbs !== null ? (periodChangeAbs >= 0 ? 'pos' : 'neg') : undefined}
        todayChange={fmt(todayChangeAbs, true)}
        todayChangePct={fmtPct(todayChangePct)}
        todayTrend={todayChangeAbs !== null ? (todayChangeAbs >= 0 ? 'pos' : 'neg') : undefined}
      />

      <PortfolioPerformance
        series={liveSeries}
        currency={selectedCurrency}
        loading={chartLoading}
        period={period}
        onPeriodChange={setPeriod}
      />

      <HoldingsList
        assetsCount={assets.length}
        valuations={valuations}
        portfolioMap={portfolioMap}
        totalValue={totalValue}
        selectedCurrency={selectedCurrency}
        loading={baseLoading}
        onAssetClick={openAsset}
      />

      {showAddAsset && (
        <AddAssetDialog
          portfolios={portfolios}
          userId={userId}
          defaultPortfolioId={selectedPortfolioId}
          onClose={() => setShowAddAsset(false)}
        />
      )}
    </>
  )
}
