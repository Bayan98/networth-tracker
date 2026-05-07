'use client'

import { useMemo } from 'react'
import type { Asset } from '@networth/types'
import { PRICEABLE_TYPES, resolveAssetPrice, safePercentChange } from '@networth/utils'
import type { SeriesPoint } from '@networth/utils'
import type { Period } from '@/components/ui/area-chart'
import { usePortfolioHistory } from './use-portfolio-history'
import { usePrices } from './use-prices'

export interface AssetValuation {
  asset: Asset
  source: 'live' | 'manual' | 'cost_basis'
  qty: number
  avgCost: number
  price: number
  priceCcy: string
  value: number | null
  costBasis: number | null
  startValue: number | null
  changeAbs: number | null
  changePct: number | null
}

interface Options {
  quantityOverrides?: Record<string, number>
  missingQuantityFallback?: number
  priceAssets?: Asset[]
  replaceLiveCostBasis?: boolean
}

export function usePortfolioValuation(
  assets: Asset[],
  period: Period,
  displayCurrency: string,
  options: Options = {},
) {
  const {
    quantityOverrides,
    missingQuantityFallback = 0,
    priceAssets = assets,
    replaceLiveCostBasis = true,
  } = options

  const priceItems = priceAssets
    .filter((h) => h.symbol && PRICEABLE_TYPES.has(h.asset_type))
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices, currencies, loading: pricesLoading } = usePrices(priceItems)

  const history = usePortfolioHistory(assets, period, displayCurrency)

  const valuations = useMemo<AssetValuation[]>(() => assets.map((asset) => {
    const { price: rawPrice, source } = resolveAssetPrice(asset, prices)
    const overrideQty = quantityOverrides?.[asset.id]
    const hookQty = history.quantityPerAsset[asset.id]
    const qty = overrideQty !== undefined
      ? overrideQty
      : hookQty !== undefined
      ? hookQty
      : missingQuantityFallback
    const avgCost = history.avgCostPerAsset[asset.id] ?? 0
    const priceCcy = source === 'live' ? (currencies[asset.symbol?.toUpperCase() ?? ''] ?? 'USD') : asset.currency
    const price = source === 'cost_basis' ? avgCost : rawPrice
    const fxToday = history.todayFx(priceCcy)
    const fxAsset = history.todayFx(asset.currency)
    const value: number | null = fxToday !== null && price > 0 ? qty * price * fxToday : null
    const costBasis: number | null = fxAsset !== null ? qty * avgCost * fxAsset : null
    const startPrice = source === 'live' ? (history.startPricePerAsset[asset.id] ?? null) : null
    const startValue: number | null = startPrice !== null && fxToday !== null
      ? qty * startPrice * fxToday
      : null
    const changeAbs: number | null = source === 'live' && value !== null && startValue !== null
      ? value - startValue
      : null
    const changePct = safePercentChange(changeAbs, startValue)

    return { asset, source, qty, avgCost, price, priceCcy, value, costBasis, startValue, changeAbs, changePct }
  }), [
    assets,
    prices,
    quantityOverrides,
    history.quantityPerAsset,
    missingQuantityFallback,
    history.avgCostPerAsset,
    currencies,
    history.todayFx,
    history.startPricePerAsset,
  ])

  const enriched = useMemo(
    () => valuations.map(({ asset, value }) => ({ asset, value })),
    [valuations],
  )

  const totalValue = useMemo(() => valuations.reduce<number | null>(
    (sum, e) => (sum !== null && e.value !== null ? sum + e.value : null),
    0,
  ), [valuations])

  const totalCostBasis = useMemo(() => valuations.reduce<number | null>(
    (sum, e) => (sum !== null && e.costBasis !== null ? sum + e.costBasis : null),
    0,
  ), [valuations])

  const totalGainAbs = totalValue !== null && totalCostBasis !== null ? totalValue - totalCostBasis : null
  const totalGainPct = totalCostBasis !== null && totalCostBasis > 0
    ? safePercentChange(totalGainAbs, totalCostBasis)
    : null

  const liveSeries = useMemo<SeriesPoint[]>(() => {
    if (history.series.length === 0 || totalValue === null || pricesLoading) return history.series
    const today = new Date().toISOString().slice(0, 10)
    const last = history.series[history.series.length - 1]
    if (last.date !== today) return history.series
    return [
      ...history.series.slice(0, -1),
      {
        ...last,
        marketValue: totalValue,
        costBasis: replaceLiveCostBasis ? (totalCostBasis ?? last.costBasis) : last.costBasis,
      },
    ]
  }, [history.series, totalValue, totalCostBasis, pricesLoading, replaceLiveCostBasis])

  const periodStartValue = liveSeries.length >= 2 ? liveSeries[0].marketValue : 0
  const periodChangeAbs = liveSeries.length >= 2
    ? liveSeries[liveSeries.length - 1].marketValue - periodStartValue
    : null
  const periodChangePct = periodStartValue > 0
    ? safePercentChange(periodChangeAbs, periodStartValue)
    : null

  const todayChangeAbs = totalValue !== null && history.prevDayValue !== null
    ? totalValue - history.prevDayValue
    : null
  const todayChangePct = history.prevDayValue !== null && history.prevDayValue > 0
    ? safePercentChange(todayChangeAbs, history.prevDayValue)
    : null

  return {
    valuations,
    enriched,
    series: history.series,
    liveSeries,
    totalValue,
    totalCostBasis,
    totalGainAbs,
    totalGainPct,
    periodChangeAbs,
    periodChangePct,
    todayChangeAbs,
    todayChangePct,
    avgCostPerAsset: history.avgCostPerAsset,
    quantityPerAsset: history.quantityPerAsset,
    startPricePerAsset: history.startPricePerAsset,
    prevDayValue: history.prevDayValue,
    loading: history.loading,
    chartLoading: history.chartLoading,
    pricesLoading,
    fxError: history.fxError,
    priceError: history.priceError,
  }
}
