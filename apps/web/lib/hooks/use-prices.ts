'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PriceMap = Record<string, number>

interface PriceItem {
  symbol: string
  asset_type: string
}

export function usePrices(items: PriceItem[]) {
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(false)

  // Stable key so the effect only re-runs when symbols actually change
  const key = items.map((i) => `${i.symbol}:${i.asset_type}`).join(',')
  const prevKey = useRef('')

  useEffect(() => {
    if (items.length === 0) return

    async function fetch() {
      setLoading(true)
      try {
        const supabase = createClient()
const { data, error } = await supabase.functions.invoke('fetch-prices', {
          body: { items },
        })
        if (!error && data?.prices) {
          setPrices(data.prices)
        }
      } catch (err) {
        console.error('usePrices error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
    const interval = setInterval(fetch, 60_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { prices, loading }
}
