'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType } from '@networth/types'

const PRICEABLE: AssetType[] = ['stock', 'etf', 'bond', 'mutual_fund', 'commodity', 'crypto']

export function usePriceAtDate(
  symbol: string | null,
  assetType: AssetType | null,
  date: string,
  enabled: boolean,
): { price: number | null; loading: boolean } {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false })

  useEffect(() => {
    if (!enabled || !symbol || !assetType || !PRICEABLE.includes(assetType) || !date) {
      setPrice(null)
      return
    }

    const guard = { cancelled: false }
    abortRef.current = guard
    setLoading(true)
    setPrice(null)

    const supabase = createClient()
    supabase.functions
      .invoke('fetch-price-at-date', { body: { symbol, asset_type: assetType, date } })
      .then(({ data }) => {
        if (guard.cancelled) return
        setPrice((data as { price?: number | null })?.price ?? null)
      })
      .catch(() => { if (!guard.cancelled) setPrice(null) })
      .finally(() => { if (!guard.cancelled) setLoading(false) })

    return () => { guard.cancelled = true }
  }, [symbol, assetType, date, enabled])

  return { price, loading }
}
