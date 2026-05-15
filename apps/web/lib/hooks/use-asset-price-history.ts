'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientCache, setClientCache } from '@/lib/client-cache'
import { PRICEABLE_TYPES } from '@networth/utils'
import type { Asset, CurrencyCode } from '@networth/types'
import type { Period } from '@/components/charts/chart-utils'

export interface AssetPricePoint {
  date: string
  price: number
}

interface PriceHistoryResponse {
  history?: Record<string, AssetPricePoint[]>
  currencies?: Record<string, string>
}

interface CacheEntry {
  points: AssetPricePoint[]
  currency: CurrencyCode
}

const ASSET_PRICE_HISTORY_CACHE_VERSION = 'n1'
const ASSET_PRICE_HISTORY_TTL_MS: Record<Period, number> = {
  '1w': 12 * 60 * 60 * 1000,
  '1m': 12 * 60 * 60 * 1000,
  '1y': 24 * 60 * 60 * 1000,
  '5y': 24 * 60 * 60 * 1000,
}

export function useAssetPriceHistory(asset: Asset, period: Period) {
  const [points, setPoints] = useState<AssetPricePoint[]>([])
  const [currency, setCurrency] = useState<CurrencyCode>(asset.currency)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const symbol = asset.symbol?.trim().toUpperCase() ?? ''
  const enabled = Boolean(symbol) && PRICEABLE_TYPES.has(asset.asset_type)

  useEffect(() => {
    if (!enabled) {
      setPoints([])
      setCurrency(asset.currency)
      setLoading(false)
      setError(null)
      return
    }

    const cacheKey = `asset-price-history:${ASSET_PRICE_HISTORY_CACHE_VERSION}:${symbol}:${asset.asset_type}:${period}`
    const cached = getClientCache<CacheEntry>(cacheKey)
    if (cached) {
      setPoints(cached.points)
      setCurrency(cached.currency)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const supabase = createClient()
    supabase.functions
      .invoke('fetch-price-history', {
        body: { items: [{ symbol, asset_type: asset.asset_type }], period },
      })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          console.error('[Prices] fetch-price-history failed:', error)
          setPoints([])
          setError('Failed to load asset price history')
          return
        }

        const response = data as PriceHistoryResponse
        const nextPoints = response.history?.[symbol] ?? []
        const nextCurrency = (response.currencies?.[symbol] ?? (asset.asset_type === 'crypto' ? 'USD' : asset.currency)) as CurrencyCode

        setPoints(nextPoints)
        setCurrency(nextCurrency)
        setClientCache(cacheKey, { points: nextPoints, currency: nextCurrency }, ASSET_PRICE_HISTORY_TTL_MS[period])
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[Prices] fetch-price-history exception:', err)
        setPoints([])
        setError('Failed to load asset price history')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [asset.asset_type, asset.currency, enabled, period, symbol])

  return { points, currency, loading, error }
}
