'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { formatPercent } from '@networth/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { Portfolio, Asset, CurrencyCode, AssetType } from '@networth/types'
import { usePortfolioValuation } from '@/lib/hooks/use-portfolio-valuation'
import { getAssetsViewState, setAssetsViewState } from '@/lib/assets-view-state'
import type { Period } from '@/components/charts/chart-utils'
import { AddAssetDialog } from '../dialogs/add-asset-dialog'
import { AssetTypeFilter } from './asset-type-filter'
import { AssetsPageHeader } from './assets-page-header'
import { HoldingsList, type HoldingsChangePeriod } from './holdings-list'
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
  const [holdingsChangePeriod, setHoldingsChangePeriod] = useState<HoldingsChangePeriod>('total')
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [cacheReady, setCacheReady] = useState(false)

  const byPortfolio = selectedPortfolioId
    ? assets.filter((asset) => asset.portfolio_id === selectedPortfolioId)
    : assets

  const visible =
    selectedTypes.size > 0
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
  } = usePortfolioValuation(visible, period, selectedCurrency, {
    priceAssets: assets,
  })
  const holdingsLookupPeriod: Period =
    holdingsChangePeriod === 'total' || holdingsChangePeriod === '1d' ? period : holdingsChangePeriod
  const { valuations: holdingsPeriodValuations, chartLoading: holdingsPeriodLoading } = usePortfolioValuation(
    visible,
    holdingsLookupPeriod,
    selectedCurrency,
    {
      priceAssets: assets,
    },
  )
  const holdingsPeriodValuationMap = useMemo(
    () => Object.fromEntries(holdingsPeriodValuations.map((valuation) => [valuation.asset.id, valuation])),
    [holdingsPeriodValuations],
  )
  const holdingsValuations = useMemo(
    () =>
      valuations.map((valuation) => {
        if (holdingsChangePeriod === 'total') {
          return {
            ...valuation,
            priceReturnAbs: valuation.totalReturnAbs,
            priceReturnPct: valuation.totalReturnPct,
          }
        }
        if (holdingsChangePeriod === '1d') {
          return {
            ...valuation,
            priceReturnAbs: valuation.todayReturnAbs,
            priceReturnPct: valuation.todayReturnPct,
          }
        }

        const periodValuation = holdingsPeriodValuationMap[valuation.asset.id]
        return {
          ...valuation,
          priceReturnAbs: periodValuation?.priceReturnAbs ?? null,
          priceReturnPct: periodValuation?.priceReturnPct ?? null,
        }
      }),
    [holdingsChangePeriod, holdingsPeriodValuationMap, valuations],
  )
  const holdingsLoading =
    holdingsChangePeriod === 'total' || holdingsChangePeriod === '1d' ? baseLoading : holdingsPeriodLoading

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

  const fmt = (value: number | null, withSign = false, loading = baseLoading): ReactNode => {
    if (loading) return <Skeleton width={80} height="0.85em" radius={3} inline />
    return displayPrice(value, selectedCurrency, { withSign })
  }
  const fmtPct = (value: number | null, loading = baseLoading): ReactNode => {
    if (loading) return <Skeleton width={44} height="0.75em" radius={3} inline />
    if (value === null) return '—'
    return formatPercent(value)
  }

  return (
    <>
      <AssetsPageHeader
        portfolioName={portfolioName}
        holdingCount={visible.length}
        portfolioCount={portfolioCount}
        onAddAsset={() => setShowAddAsset(true)}
        portfolioSelector={
          <PortfolioClient
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
            onSelect={handlePortfolioSelect}
            userId={userId}
          />
        }
      />

      {(fxError || priceError) && (
        <div
          role="status"
          className="callout callout-warn"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'currentColor',
              marginTop: 8,
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {fxError && <p style={{ margin: 0 }}>{fxError}</p>}
            {priceError && <p style={{ margin: 0 }}>{priceError}</p>}
          </div>
        </div>
      )}

      <div className="page-tools">
        <AssetTypeFilter allTypes={allTypes} selectedTypes={selectedTypes} onToggle={toggleType} />
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
        valuations={holdingsValuations}
        portfolioMap={portfolioMap}
        totalValue={totalValue}
        selectedCurrency={selectedCurrency}
        loading={holdingsLoading}
        changePeriod={holdingsChangePeriod}
        onChangePeriod={setHoldingsChangePeriod}
        onAssetClick={openAsset}
        onAddAsset={() => setShowAddAsset(true)}
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
