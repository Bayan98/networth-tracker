'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FxRates } from '@networth/utils'

export function useTodayFx(
  holdings: Array<{ currency: string }>,
  displayCurrency: string,
): { fx: (from: string) => number; loading: boolean } {
  const [rates, setRates] = useState<FxRates>({})
  const [loading, setLoading] = useState(true)

  const currenciesKey = useMemo(() => {
    const set = new Set<string>([
      'USD',
      ...holdings.map((h) => h.currency.toUpperCase()),
    ])
    return [...set].sort().join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.map((h) => h.currency).join(',')])

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
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-fx-rates', { body: { pairs } })
      .then(({ data, error }) => {
        if (!error && data?.rates) setRates(data.rates as FxRates)
        setLoading(false)
      })
      .catch(() => setLoading(false))
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

  return { fx, loading }
}
