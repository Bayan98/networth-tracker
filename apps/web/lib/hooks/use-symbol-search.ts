'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SymbolResult {
  symbol: string
  name: string
  exchange?: string
  type?: string
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
        setResults(data?.results ?? [])
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
