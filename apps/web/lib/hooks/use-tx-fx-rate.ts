'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useTxFxRate(
  fromCurrency: string,
  toCurrency: string | undefined,
  dateStr: string,
): { rate: number; loading: boolean } {
  const [rate, setRate] = useState(1)
  const [loading, setLoading] = useState(false)

  const from = fromCurrency.toUpperCase()
  const to = toCurrency?.toUpperCase()
  const needsFx = !!to && from !== to

  useEffect(() => {
    if (!needsFx) {
      setRate(1)
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-fx-rates', {
        body: { pairs: [{ from, to, date: dateStr }] },
      })
      .then(({ data }) => {
        setRate(data?.rates?.[`${from}_${to}_${dateStr}`] ?? 1)
        setLoading(false)
      })
      .catch(() => { setRate(1); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsFx, from, to, dateStr])

  return { rate, loading }
}
