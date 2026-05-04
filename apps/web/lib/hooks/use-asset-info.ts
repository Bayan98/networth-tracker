'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Holding {
  symbol: string
  name: string
  pct: number
}

export interface NewsItem {
  title: string
  publisher: string
  link: string
  publishedAt: number
}

export interface AssetInfo {
  sector: string | null
  country: string | null
  pe: number | null
  eps: number | null
  analystRating: string | null
  analystCount: number | null
  holdings: Holding[] | null
  news: NewsItem[] | null
  yahooUrl: string | null
  description: string | null
  dividend: string | null
  beta: number | null
}

const PRICEABLE = ['stock', 'etf', 'bond', 'mutual_fund', 'commodity', 'crypto']

export function useAssetInfo(
  symbol: string | null,
  assetType: string,
): { info: AssetInfo | null; loading: boolean } {
  const [info, setInfo] = useState<AssetInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol || !PRICEABLE.includes(assetType)) return

    let cancelled = false
    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-asset-info', { body: { symbol, asset_type: assetType } })
      .then(({ data }) => {
        if (!cancelled) setInfo((data as AssetInfo) ?? null)
      })
      .catch(() => { if (!cancelled) setInfo(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [symbol, assetType])

  return { info, loading }
}
