'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Asset } from '@networth/types'
import { buildTimeAxis, computeSeries, lookupFxRate, nearestPriceForDate, PRICEABLE_TYPES } from '@networth/utils'
import type { SeriesPoint, PriceHistory, RawTransaction, FxRates } from '@networth/utils'
import type { Period } from '@/components/ui/area-chart'

export type { SeriesPoint } from '@networth/utils'

export function usePortfolioHistory(
  assets: Asset[],
  period: Period,
  displayCurrency: string,
): {
  series: SeriesPoint[]
  avgCostPerAsset: Record<string, number>
  quantityPerAsset: Record<string, number>
  startPricePerAsset: Record<string, number | null>
  prevDayValue: number | null
  loading: boolean
  chartLoading: boolean
  fxError: string | null
  priceError: string | null
  todayFx: (from: string) => number | null
} {
  const [priceHistory, setPriceHistory] = useState<PriceHistory>({})
  // Daily price history — always 1w resolution, used for the "Today" change stat
  const [dailyPriceHistory, setDailyPriceHistory] = useState<PriceHistory>({})
  // Price currencies returned by fetch-price-history (already normalized to major currencies)
  const [priceCurrencies, setPriceCurrencies] = useState<Record<string, string>>({})
  const [rawTransactions, setRawTransactions] = useState<RawTransaction[]>([])
  const [fxRates, setFxRates] = useState<FxRates>({})
  const [fxContext, setFxContext] = useState<{ period: Period; currency: string; priceCcyKey: string } | null>(null)
  const [priceLoading, setPriceLoading] = useState(true)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [txLoading, setTxLoading] = useState(true)
  const [fxLoading, setFxLoading] = useState(true)
  const [fxError, setFxError] = useState<string | null>(null)

  // Client-side caches — keyed by period so switching back is instant
  const priceCache = useRef<Map<Period, PriceHistory>>(new Map())
  const fxCache = useRef<Map<string, FxRates>>(new Map())

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
  const priceCurrenciesKey = Object.entries(priceCurrencies).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',')


  // Invalidate caches when the asset set changes
  useEffect(() => { priceCache.current.clear() }, [priceableKey])
  useEffect(() => { fxCache.current.clear() }, [assetIdsKey])

  useEffect(() => {
    if (assets.length === 0) {
      setRawTransactions([])
      setTxLoading(false)
      return
    }
    let cancelled = false
    setTxLoading(true)
    const supabase = createClient()
    supabase
      .from('transactions')
      .select('asset_id, quantity, price, transaction_type, executed_at, currency')
      .in('asset_id', assets.map((h) => h.id))
      .order('executed_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setRawTransactions(data ?? [])
        setTxLoading(false)
        setFxLoading(true)
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetIdsKey])

  useEffect(() => {
    if (assets.length === 0 || priceableItems.length === 0) {
      setPriceHistory({})
      setPriceLoading(false)
      return
    }
    const cached = priceCache.current.get(period)
    if (cached) {
      setPriceHistory(cached)
      setPriceError(null)
      setPriceLoading(false)
      return
    }
    let cancelled = false
    setPriceLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-price-history', { body: { items: priceableItems, period } })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.history) {
          console.error('[Prices] fetch-price-history failed:', error)
          setPriceError('Failed to load price history — chart and period changes may be unavailable')
          setPriceHistory({})
        } else {
          setPriceError(null)
          const history = data.history as PriceHistory
          priceCache.current.set(period, history)
          setPriceHistory(history)
          if (data.currencies && typeof data.currencies === 'object') {
            setPriceCurrencies((prev) => ({ ...prev, ...(data.currencies as Record<string, string>) }))
          }
        }
        setPriceLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[Prices] fetch-price-history exception:', err)
        setPriceError('Failed to load price history — chart and period changes may be unavailable')
        setPriceHistory({})
        setPriceLoading(false)
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, priceableKey])

  // Fetch 1w daily price history once per asset set for the "Today" stat.
  // Not re-fetched on period change — daily prices don't depend on the chart period.
  useEffect(() => {
    if (priceableItems.length === 0) {
      setDailyPriceHistory({})
      return
    }
    let cancelled = false
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-price-history', { body: { items: priceableItems, period: '1w' } })
      .then(({ data }) => {
        if (cancelled) return
        setDailyPriceHistory((data?.history ?? {}) as PriceHistory)
        if (data?.currencies && typeof data.currencies === 'object') {
          setPriceCurrencies((prev) => ({ ...prev, ...(data.currencies as Record<string, string>) }))
        }
      })
      .catch(() => { if (!cancelled) setDailyPriceHistory({}) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceableKey])

  useEffect(() => {
    if (assets.length === 0) {
      setFxRates({})
      setFxLoading(false)
      return
    }

    const fxCacheKey = `${period}:${displayCurrency}:${assetCcyKey}:${priceCurrenciesKey}`
    const cachedFx = fxCache.current.get(fxCacheKey)
    if (cachedFx) {
      setFxRates(cachedFx)
      setFxContext({ period, currency: displayCurrency, priceCcyKey: priceCurrenciesKey })
      setFxError(null)
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

    // Always need USD→display for stocks priced in USD, and each unique price currency→display
    const uniquePriceCurrencies = [...new Set(Object.values(priceCurrencies).map((c) => c.toUpperCase()))]
    for (const ccy of uniquePriceCurrencies) {
      for (const date of timeAxis) {
        addPair(ccy, displayCurrency, date)
      }
    }
    if (uniquePriceCurrencies.length === 0 && priceableItems.length > 0) {
      for (const date of timeAxis) {
        addPair('USD', displayCurrency, date)
      }
    }

    const pairs = [...pairsMap.values()]

    if (pairs.length === 0) {
      setFxRates({})
      setFxContext({ period, currency: displayCurrency, priceCcyKey: priceCurrenciesKey })
      setFxLoading(false)
      return
    }

    let cancelled = false
    setFxLoading(true)
    setFxError(null)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-fx-rates', { body: { pairs } })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.rates) {
          console.error('[FX] fetch-fx-rates failed:', error)
          setFxError('Failed to load exchange rates')
          setFxRates({})
        } else {
          const rates = data.rates as FxRates
          const missing = pairs.filter((p) => !(`${p.from}_${p.to}_${p.date}` in rates))
          if (missing.length > 0) {
            console.error('[FX] Missing rates for pairs:', missing)
            setFxError('Some exchange rates are unavailable — asset values may be incorrect')
          } else if (data.clamped_pairs?.length) {
            const pairs = (data.clamped_pairs as string[]).join(', ')
            const from = data.clamped_from as string
            console.warn(`[FX] Rates for ${pairs} unavailable before ${from} — using ${from} rates as fallback`)
            setFxError(`Historical rates for ${pairs} are unavailable before ${from} — values before that date use ${from} rates`)
          }
          fxCache.current.set(fxCacheKey, rates)
          setFxRates(rates)
          setFxContext({ period, currency: displayCurrency, priceCcyKey: priceCurrenciesKey })
        }
        setFxLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[FX] fetch-fx-rates exception:', err)
        setFxError('Failed to load exchange rates')
        setFxRates({})
        setFxContext({ period, currency: displayCurrency, priceCcyKey: priceCurrenciesKey })
        setFxLoading(false)
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTransactions, assetIdsKey, assetCcyKey, period, displayCurrency, priceableKey, priceCurrenciesKey])

  const fxReady = !fxLoading && fxContext?.period === period && fxContext?.currency === displayCurrency && fxContext?.priceCcyKey === priceCurrenciesKey

  const series = useMemo(
    () => fxReady ? computeSeries(buildTimeAxis(period), rawTransactions, assets, priceHistory, fxRates, displayCurrency, priceCurrencies) : [],
    [fxReady, rawTransactions, assets, period, priceHistory, fxRates, displayCurrency, priceCurrencies],
  )

  const todayFx = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (from: string): number | null => lookupFxRate(fxRates, from, displayCurrency, today)
  }, [fxRates, displayCurrency])

  const avgCostPerAsset = useMemo<Record<string, number>>(() => {
    const assetCurrencyMap = new Map(assets.map((h) => [h.id, h.currency]))
    const totalValue: Record<string, number> = {}
    const totalQty: Record<string, number> = {}

    for (const tx of rawTransactions) {
      const qty = Number(tx.quantity)
      if (tx.transaction_type === 'split') {
        if (tx.asset_id in totalQty) totalQty[tx.asset_id] *= qty
        continue
      }
      if (tx.transaction_type !== 'buy' && tx.transaction_type !== 'deposit') continue
      const assetCcy = assetCurrencyMap.get(tx.asset_id)
      if (!assetCcy) continue
      const from = tx.currency.toUpperCase()
      const date = tx.executed_at.slice(0, 10)
      const rate = lookupFxRate(fxRates, from, assetCcy, date)
      if (rate === null) continue
      totalValue[tx.asset_id] = (totalValue[tx.asset_id] ?? 0) + qty * Number(tx.price) * rate
      totalQty[tx.asset_id] = (totalQty[tx.asset_id] ?? 0) + qty
    }

    const result: Record<string, number> = {}
    for (const id of Object.keys(totalQty)) {
      result[id] = totalQty[id] > 0 ? totalValue[id] / totalQty[id] : 0
    }
    return result
  }, [rawTransactions, assets, fxRates])

  const startPricePerAsset = useMemo<Record<string, number | null>>(() => {
    if (priceLoading) return {}
    const timeAxis = buildTimeAxis(period)
    const startDate = timeAxis[0]

    const firstBuyDate: Record<string, string> = {}
    for (const tx of rawTransactions) {
      if (tx.transaction_type === 'buy' || tx.transaction_type === 'deposit') {
        const d = tx.executed_at.slice(0, 10)
        if (!firstBuyDate[tx.asset_id] || d < firstBuyDate[tx.asset_id]) firstBuyDate[tx.asset_id] = d
      }
    }

    const result: Record<string, number | null> = {}
    for (const asset of assets) {
      if (!asset.symbol || !PRICEABLE_TYPES.has(asset.asset_type)) continue
      const sym = asset.symbol.toUpperCase()
      const history = priceHistory[sym]
      const refDate = firstBuyDate[asset.id] && firstBuyDate[asset.id] > startDate
        ? firstBuyDate[asset.id]
        : startDate
      result[asset.id] = nearestPriceForDate(history, refDate)
    }
    return result
  }, [assets, priceHistory, period, rawTransactions, priceLoading])

  const quantityPerAsset = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const tx of rawTransactions) {
      const qty = Number(tx.quantity)
      if (tx.transaction_type === 'buy' || tx.transaction_type === 'deposit') {
        result[tx.asset_id] = (result[tx.asset_id] ?? 0) + qty
      } else if (tx.transaction_type === 'sell' || tx.transaction_type === 'withdrawal') {
        result[tx.asset_id] = (result[tx.asset_id] ?? 0) - qty
      } else if (tx.transaction_type === 'split') {
        result[tx.asset_id] = (result[tx.asset_id] ?? 0) * qty
      }
    }
    return result
  }, [rawTransactions])

  // Previous-day portfolio value for the "Today" change stat.
  // Always uses the 1w daily fetch so Today is stable across period switches.
  const prevDayValue = useMemo<number | null>(() => {
    const daily = Object.keys(dailyPriceHistory).length > 0 ? dailyPriceHistory : priceHistory
    if (Object.keys(daily).length === 0 && priceableItems.length > 0) return null
    const today = new Date().toISOString().slice(0, 10)
    const previousDay = new Date()
    previousDay.setUTCDate(previousDay.getUTCDate() - 1)
    const previousDate = previousDay.toISOString().slice(0, 10)
    const firstTxDate: Record<string, string> = {}
    for (const tx of rawTransactions) {
      const d = tx.executed_at.slice(0, 10)
      if (!firstTxDate[tx.asset_id] || d < firstTxDate[tx.asset_id]) firstTxDate[tx.asset_id] = d
    }
    let total = 0
    for (const h of assets) {
      const qty = quantityPerAsset[h.id] ?? 0
      if (qty <= 0) continue
      const sym = h.symbol?.toUpperCase()
      if (sym && PRICEABLE_TYPES.has(h.asset_type)) {
        const hist = daily[sym]
        const prevPrice = hist ? [...hist].filter((p) => p.date < today).slice(-1)[0]?.price : undefined
        if (prevPrice == null) {
          // No daily history — fall back to avg cost basis, same as computeSeries does for
          // assets without price history. Without this fallback, assets with no 1w data
          // contribute $0 to prevDayValue but their full live value to totalValue, inflating "Today".
          const avgCost = avgCostPerAsset[h.id]
          if (avgCost != null && avgCost > 0) {
            const fx = lookupFxRate(fxRates, h.currency, displayCurrency, today) ?? 1
            total += qty * avgCost * fx
          }
          continue
        }
        const priceCcy = (priceCurrencies[sym] ?? 'USD').toUpperCase()
        const fx = lookupFxRate(fxRates, priceCcy, displayCurrency, today) ?? 1
        total += qty * prevPrice * fx
      } else {
        const avgCost = avgCostPerAsset[h.id] ?? 0
        let price = avgCost

        if (h.manual_price != null) {
          if (h.manual_price_date == null || previousDate >= h.manual_price_date) {
            price = h.manual_price
          } else {
            const startDate = firstTxDate[h.id]
            if (startDate && startDate < h.manual_price_date) {
              const startMs = new Date(startDate + 'T12:00:00Z').getTime()
              const manualMs = new Date(h.manual_price_date + 'T12:00:00Z').getTime()
              const previousMs = new Date(previousDate + 'T12:00:00Z').getTime()
              const t = Math.max(0, Math.min(1, (previousMs - startMs) / (manualMs - startMs)))
              price = avgCost + (h.manual_price - avgCost) * t
            }
          }
        }

        const fx = lookupFxRate(fxRates, h.currency, displayCurrency, today) ?? 1
        total += qty * price * fx
      }
    }
    return total
  }, [assets, quantityPerAsset, avgCostPerAsset, priceHistory, dailyPriceHistory, rawTransactions, fxRates, displayCurrency, priceableItems.length, priceCurrencies])

  return {
    series,
    avgCostPerAsset,
    quantityPerAsset,
    startPricePerAsset,
    prevDayValue,
    loading: txLoading,
    chartLoading: priceLoading || fxLoading || !fxReady,
    fxError,
    priceError,
    todayFx,
  }
}
