'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeAssetSymbol } from '@networth/utils'

export interface SymbolResult {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

function normalizeCryptoResults(results: SymbolResult[]): SymbolResult[] {
  const seen = new Set<string>()
  const normalized: SymbolResult[] = []

  for (const result of results) {
    const symbol = result.symbol.toUpperCase()
    if (symbol.includes('-') && !symbol.endsWith('-USD')) continue

    const normalizedSymbol = normalizeAssetSymbol(symbol, 'crypto')
    if (!normalizedSymbol || seen.has(normalizedSymbol)) continue

    seen.add(normalizedSymbol)
    normalized.push({ ...result, symbol: normalizedSymbol, exchange: undefined })
  }

  return normalized
}

export function useSymbolSearch() {
  const [results, setResults] = useState<SymbolResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function search(query: string, assetType?: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (!q) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase.functions.invoke('search-symbols', { body: { query: q, asset_type: assetType } })
        const results = data?.results ?? []
        setResults(assetType === 'crypto' ? normalizeCryptoResults(results) : results)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
  }

  function clear() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setResults([])
    setLoading(false)
  }

  return { results, loading, search, clear }
}
