'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Asset } from '@networth/types'
import { buildTimeAxis, computeSeries, PRICEABLE_TYPES } from '@networth/utils'
import type { SeriesPoint, PriceHistory, RawTransaction, FxRates } from '@networth/utils'
import type { Period } from '@/components/ui/area-chart'

export type { SeriesPoint } from '@networth/utils'

export function usePortfolioHistory(
  assets: Asset[],
  period: Period,
  displayCurrency: string,
): {
  series: SeriesPoint[]
  startPrices: Record<string, number>
  avgCostPerAsset: Record<string, number>
  loading: boolean
  todayFx: (from: string) => number
  startFx: (from: string) => number
} {
  const [priceHistory, setPriceHistory] = useState<PriceHistory>({})
  const [rawTransactions, setRawTransactions] = useState<RawTransaction[]>([])
  const [fxRates, setFxRates] = useState<FxRates>({})
  const [priceLoading, setPriceLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [fxLoading, setFxLoading] = useState(true)

  const assetIdsKey = assets.map((h) => h.id).join(',')
  const assetCcyKey = assets.map((h) => h.currency).join(',')

  const priceableItems = useMemo(
    () => assets
      .filter((h) => h.symbol && PRICEABLE_TYPES.has(h.asset_type))
      .map((h) => ({ symbol: h.symbol!.toUpperCase(), asset_type: h.asset_type })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets.map((h) => h.symbol).join(','), assets.map((h) => h.asset_type).join(',')],
  )

  const priceableKey = priceableItems.map((i) => i.symbol).join(',')

  useEffect(() => {
    if (assets.length === 0) {
      setRawTransactions([])
      setTxLoading(false)
      return
    }
    setTxLoading(true)
    const supabase = createClient()
    supabase
      .from('transactions')
      .select('asset_id, quantity, price, transaction_type, executed_at, currency')
      .in('asset_id', assets.map((h) => h.id))
      .order('executed_at', { ascending: true })
      .then(({ data }) => {
        setRawTransactions(data ?? [])
        setTxLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetIdsKey])

  useEffect(() => {
    if (assets.length === 0 || priceableItems.length === 0) {
      setPriceHistory({})
      setPriceLoading(false)
      return
    }
    setPriceLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-price-history', { body: { items: priceableItems, period } })
      .then(({ data, error }) => {
        setPriceHistory(!error && data?.history ? data.history as PriceHistory : {})
        setPriceLoading(false)
      })
      .catch(() => { setPriceHistory({}); setPriceLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, priceableKey])

  useEffect(() => {
    if (assets.length === 0) {
      setFxRates({})
      setFxLoading(false)
      return
    }

    const assetCurrencyMap = new Map(assets.map((h) => [h.id, h.currency]))
    const timeAxis = buildTimeAxis(period)
    const pairsMap = new Map<string, { from: string; to: string; date: string }>()

    const addPair = (from: string, to: string, date: string) => {
      const f = from.toUpperCase()
      const t = to.toUpperCase()
      if (f === t) return
      const k = `${f}_${t}_${date}`
      if (!pairsMap.has(k)) pairsMap.set(k, { from: f, to: t, date })
    }

    for (const tx of rawTransactions) {
      const assetCcy = assetCurrencyMap.get(tx.asset_id)
      if (assetCcy) addPair(tx.currency, assetCcy, tx.executed_at.slice(0, 10))
    }

    const uniqueAssetCurrencies = [...new Set(assets.map((h) => h.currency))]
    for (const ccy of uniqueAssetCurrencies) {
      for (const date of timeAxis) {
        addPair(ccy, displayCurrency, date)
      }
    }

    if (displayCurrency.toUpperCase() !== 'USD' && priceableItems.length > 0) {
      for (const date of timeAxis) {
        addPair('USD', displayCurrency, date)
      }
    }

    const pairs = [...pairsMap.values()]

    if (pairs.length === 0) {
      setFxRates({})
      setFxLoading(false)
      return
    }

    setFxLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-fx-rates', { body: { pairs } })
      .then(({ data, error }) => {
        setFxRates(!error && data?.rates ? data.rates as FxRates : {})
        setFxLoading(false)
      })
      .catch(() => { setFxRates({}); setFxLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTransactions, assetIdsKey, assetCcyKey, period, displayCurrency, priceableKey])

  const series = useMemo(
    () => computeSeries(buildTimeAxis(period), rawTransactions, assets, priceHistory, fxRates, displayCurrency),
    [rawTransactions, assets, period, priceHistory, fxRates, displayCurrency],
  )

  const startPrices = useMemo<Record<string, number>>(() => {
    const sp: Record<string, number> = {}
    for (const [sym, points] of Object.entries(priceHistory)) {
      if (points.length > 0) sp[sym] = points[0].price
    }
    return sp
  }, [priceHistory])

  const todayFx = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (from: string): number => {
      const f = from.toUpperCase()
      const t = displayCurrency.toUpperCase()
      if (f === t) return 1.0
      return fxRates[`${f}_${t}_${today}`] ?? 1.0
    }
  }, [fxRates, displayCurrency])

  const startFx = useMemo(() => {
    const timeAxis = buildTimeAxis(period)
    const startDate = timeAxis[0] ?? new Date().toISOString().slice(0, 10)
    return (from: string): number => {
      const f = from.toUpperCase()
      const t = displayCurrency.toUpperCase()
      if (f === t) return 1.0
      return fxRates[`${f}_${t}_${startDate}`] ?? 1.0
    }
  }, [fxRates, displayCurrency, period])

  const avgCostPerAsset = useMemo<Record<string, number>>(() => {
    const assetCurrencyMap = new Map(assets.map((h) => [h.id, h.currency]))
    const totalValue: Record<string, number> = {}
    const totalQty: Record<string, number> = {}

    for (const tx of rawTransactions) {
      if (tx.transaction_type !== 'buy' && tx.transaction_type !== 'deposit') continue
      const assetCcy = assetCurrencyMap.get(tx.asset_id)
      if (!assetCcy) continue
      const from = tx.currency.toUpperCase()
      const to = assetCcy.toUpperCase()
      const date = tx.executed_at.slice(0, 10)
      const rate = from === to ? 1 : (fxRates[`${from}_${to}_${date}`] ?? 1)
      const qty = Number(tx.quantity)
      totalValue[tx.asset_id] = (totalValue[tx.asset_id] ?? 0) + qty * Number(tx.price) * rate
      totalQty[tx.asset_id] = (totalQty[tx.asset_id] ?? 0) + qty
    }

    const result: Record<string, number> = {}
    for (const id of Object.keys(totalQty)) {
      result[id] = totalQty[id] > 0 ? totalValue[id] / totalQty[id] : 0
    }
    return result
  }, [rawTransactions, assets, fxRates])

  return {
    series,
    startPrices,
    avgCostPerAsset,
    loading: priceLoading || txLoading || fxLoading,
    todayFx,
    startFx,
  }
}
