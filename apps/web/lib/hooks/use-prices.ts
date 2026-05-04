'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PriceMap = Record<string, number>
export type CurrencyMap = Record<string, string>

interface PriceItem {
  symbol: string
  asset_type: string
}

interface CacheEntry {
  prices: PriceMap
  currencies: CurrencyMap
}

const cache = new Map<string, CacheEntry>()

export function usePrices(items: PriceItem[]) {
  const key = items.map((i) => `${i.symbol}:${i.asset_type}`).sort().join(',')
  const [entry, setEntry] = useState<CacheEntry>(() => cache.get(key) ?? { prices: {}, currencies: {} })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) return

    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-prices', { body: { items } })
      .then(({ data, error }) => {
        if (!error && data?.prices) {
          const newEntry: CacheEntry = { prices: data.prices, currencies: data.currencies ?? {} }
          cache.set(key, newEntry)
          setEntry(newEntry)
        }
      })
      .catch((err) => console.error('usePrices error:', err))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { prices: entry.prices, currencies: entry.currencies, loading }
}
