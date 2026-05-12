'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientCache, setClientCache } from '@/lib/client-cache'

export interface Holding {
  symbol: string
  name: string
  pct: number
}

export interface AssetInfo {
  sector: string | null
  country: string | null
  pe: number | null
  eps: number | null
  analystRating: string | null
  analystCount: number | null
  holdings: Holding[] | null
  yahooUrl: string | null
  description: string | null
  dividend: string | null
  beta: number | null
}

const PRICEABLE = ['stock', 'etf', 'bond', 'mutual_fund', 'commodity', 'crypto']
const ASSET_INFO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function useAssetInfo(
  symbol: string | null,
  assetType: string,
): { info: AssetInfo | null; loading: boolean } {
  const [info, setInfo] = useState<AssetInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol || !PRICEABLE.includes(assetType)) {
      setInfo(null)
      setLoading(false)
      return
    }

    const normalizedSymbol = symbol.toUpperCase().trim()
    const cacheKey = `asset-info:v1:${assetType}:${normalizedSymbol}`
    const cached = getClientCache<AssetInfo>(cacheKey)
    if (cached) {
      setInfo(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-asset-info', { body: { symbol, asset_type: assetType } })
      .then(({ data }) => {
        if (cancelled) return
        const nextInfo = (data as AssetInfo) ?? null
        if (nextInfo) setClientCache(cacheKey, nextInfo, ASSET_INFO_CACHE_TTL_MS)
        setInfo(nextInfo)
      })
      .catch(() => { if (!cancelled) setInfo(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [symbol, assetType])

  return { info, loading }
}
