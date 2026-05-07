'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientCache, setClientCache } from '@/lib/client-cache'
import { lookupFxRate } from '@networth/utils'
import type { FxRates } from '@networth/utils'

const TODAY_FX_CACHE_TTL_MS = 60 * 60 * 1000

export function useTodayFx(
  assets: Array<{ currency: string }>,
  displayCurrency: string,
): { fx: (from: string) => number | null; loading: boolean; fxError: string | null } {
  const [rates, setRates] = useState<FxRates>({})
  const [activeCurrency, setActiveCurrency] = useState(displayCurrency)
  const [loading, setLoading] = useState(true)
  const [fxError, setFxError] = useState<string | null>(null)

  const currenciesKey = useMemo(() => {
    const set = new Set<string>([
      'USD',
      ...assets.map((h) => h.currency.toUpperCase()),
    ])
    return [...set].sort().join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.map((h) => h.currency).join(',')])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const display = displayCurrency.toUpperCase()
    const cacheKey = `${currenciesKey}:${display}:${today}`

    const pairs = currenciesKey
      .split(',')
      .filter((c) => c !== display)
      .map((c) => ({ from: c, to: display, date: today }))

    if (pairs.length === 0) {
      setRates({})
      setActiveCurrency(display)
      setLoading(false)
      return
    }

    const cached = getClientCache<FxRates>(`today-fx:${cacheKey}`)
    if (cached) {
      setRates(cached)
      setActiveCurrency(display)
      setLoading(false)
      return
    }

    setLoading(true)
    setFxError(null)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-fx-rates', { body: { pairs } })
      .then(({ data, error }) => {
        if (error || !data?.rates) {
          console.error('[FX] fetch-fx-rates failed:', error)
          setFxError('Failed to load exchange rates')
        } else {
          const fetched = data.rates as FxRates
          const missing = pairs.filter((p) => !(`${p.from}_${p.to}_${p.date}` in fetched))
          if (missing.length > 0) {
            console.error('[FX] Missing rates for pairs:', missing)
            setFxError('Some exchange rates are unavailable — asset values may be incorrect')
          }
          setClientCache(`today-fx:${cacheKey}`, fetched, TODAY_FX_CACHE_TTL_MS)
          setRates(fetched)
          setActiveCurrency(display)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('[FX] fetch-fx-rates exception:', err)
        setFxError('Failed to load exchange rates')
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currenciesKey, displayCurrency])

  const fx = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (from: string): number | null => lookupFxRate(rates, from, activeCurrency, today)
  }, [rates, activeCurrency])

  return { fx, loading, fxError }
}
