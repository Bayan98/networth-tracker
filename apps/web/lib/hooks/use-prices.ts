'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientCache, setClientCache } from '@/lib/client-cache'

type PriceMap = Record<string, number>
type CurrencyMap = Record<string, string>

interface PriceItem {
  symbol: string
  asset_type: string
}

interface CacheEntry {
  prices: PriceMap
  currencies: CurrencyMap
}

const PRICE_CACHE_TTL_MS = 3 * 60 * 60 * 1000

export function usePrices(items: PriceItem[]) {
  const key = items.map((i) => `${i.symbol}:${i.asset_type}`).sort().join(',')
  const cacheKey = `prices:${key}`
  const [entry, setEntry] = useState<CacheEntry>({ prices: {}, currencies: {} })
  const [loading, setLoading] = useState(items.length > 0)

  useEffect(() => {
    if (items.length === 0) {
      setEntry({ prices: {}, currencies: {} })
      setLoading(false)
      return
    }

    const cached = getClientCache<CacheEntry>(cacheKey)
    if (cached) {
      setEntry(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-prices', { body: { items } })
      .then(({ data, error }) => {
        if (!error && data?.prices) {
          const newEntry: CacheEntry = { prices: data.prices, currencies: data.currencies ?? {} }
          setClientCache(cacheKey, newEntry, PRICE_CACHE_TTL_MS)
          setEntry(newEntry)
        }
      })
      .catch((err) => console.error('usePrices error:', err))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return { prices: entry.prices, currencies: entry.currencies, loading }
}
