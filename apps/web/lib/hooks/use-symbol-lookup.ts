import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType } from '@networth/types'

const PRICEABLE: AssetType[] = ['stock', 'etf', 'bond', 'mutual_fund', 'commodity', 'crypto']

export interface SymbolInfo {
  name: string | null
  price: number | null
}

export type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found'

export function useSymbolLookup() {
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchInfo(symbol: string, assetType: AssetType): Promise<SymbolInfo> {
    const sym = symbol.trim().toUpperCase()
    if (!sym || !PRICEABLE.includes(assetType)) return { name: null, price: null }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('lookup-symbol', {
        body: { symbol: sym, asset_type: assetType },
      })
      if (!error && data) return data as SymbolInfo
    } catch (_) {
      // silently ignore
    } finally {
      setLoading(false)
    }
    return { name: null, price: null }
  }

  function lookup(
    symbol: string,
    assetType: AssetType,
    onResult: (info: SymbolInfo, status: LookupStatus) => void,
  ) {
    if (timerRef.current) clearTimeout(timerRef.current)

    const sym = symbol.trim()
    if (!sym || !PRICEABLE.includes(assetType)) return

    timerRef.current = setTimeout(async () => {
      const info = await fetchInfo(symbol, assetType)
      const status: LookupStatus = (info.name || info.price !== null) ? 'found' : 'not_found'
      onResult(info, status)
    }, 600)
  }

  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  return { lookup, cancel, loading }
}
