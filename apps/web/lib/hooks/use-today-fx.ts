'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FxRates } from '@networth/utils'

export function useTodayFx(
  assets: Array<{ currency: string }>,
  displayCurrency: string,
): { fx: (from: string) => number; loading: boolean; fxError: string | null } {
  const [rates, setRates] = useState<FxRates>({})
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

    const pairs = currenciesKey
      .split(',')
      .filter((c) => c !== display)
      .map((c) => ({ from: c, to: display, date: today }))

    if (pairs.length === 0) {
      setRates({})
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
          setRates(fetched)
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
    return (from: string): number => {
      const f = from.toUpperCase()
      const t = displayCurrency.toUpperCase()
      if (f === t) return 1
      return rates[`${f}_${t}_${today}`] ?? 1
    }
  }, [rates, displayCurrency])

  return { fx, loading, fxError }
}
