'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientCache, setClientCache } from '@/lib/client-cache'

export interface NewsItem {
  title: string
  publisher: string
  link: string
  publishedAt: number
  relatedTickers?: string[]
}

const PRICEABLE = ['stock', 'etf', 'bond', 'mutual_fund', 'commodity', 'crypto']
const ASSET_NEWS_CACHE_TTL_MS = 6 * 60 * 60 * 1000

interface AssetNewsCacheEntry {
  news: NewsItem[] | null
}

export function useAssetNews(
  symbol: string | null,
  assetType: string,
  assetName?: string | null,
): { news: NewsItem[] | null; loading: boolean } {
  const [news, setNews] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol || !PRICEABLE.includes(assetType)) {
      setNews(null)
      setLoading(false)
      return
    }

    const normalizedSymbol = symbol.toUpperCase().trim()
    const normalizedName = assetName?.trim().toLowerCase() ?? ''
    const cacheKey = `asset-news:v1:${assetType}:${normalizedSymbol}:${normalizedName}`
    const cached = getClientCache<AssetNewsCacheEntry>(cacheKey)
    if (cached) {
      setNews(cached.news)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-asset-news', { body: { symbol, asset_type: assetType, name: assetName } })
      .then(({ data }) => {
        if (cancelled) return
        const nextNews = (data as { news?: NewsItem[] | null } | null)?.news ?? null
        setClientCache(cacheKey, { news: nextNews }, ASSET_NEWS_CACHE_TTL_MS)
        setNews(nextNews)
      })
      .catch(() => { if (!cancelled) setNews(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [symbol, assetType, assetName])

  return { news, loading }
}
