'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PriceMap = Record<string, number>

interface PriceItem {
  symbol: string
  asset_type: string
}

const cache = new Map<string, PriceMap>()

export function usePrices(items: PriceItem[]) {
  const key = items.map((i) => `${i.symbol}:${i.asset_type}`).sort().join(',')
  const [prices, setPrices] = useState<PriceMap>(() => cache.get(key) ?? {})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) return

    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-prices', { body: { items } })
      .then(({ data, error }) => {
        if (!error && data?.prices) {
          cache.set(key, data.prices)
          setPrices(data.prices)
        }
      })
      .catch((err) => console.error('usePrices error:', err))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { prices, loading }
}
