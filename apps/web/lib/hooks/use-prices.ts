'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PriceMap = Record<string, number>

interface PriceItem {
  symbol: string
  asset_type: string
}

export function usePrices(items: PriceItem[]) {
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(false)

  const key = items.map((i) => `${i.symbol}:${i.asset_type}`).join(',')

  useEffect(() => {
    if (items.length === 0) return

    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-prices', { body: { items } })
      .then(({ data, error }) => {
        if (!error && data?.prices) setPrices(data.prices)
      })
      .catch((err) => console.error('usePrices error:', err))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { prices, loading }
}
