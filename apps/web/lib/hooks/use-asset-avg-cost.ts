'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@networth/types'
import type { FxRates } from '@networth/utils'

export function useAssetAvgCost(
  transactions: Transaction[],
  assetCurrency: string,
): {
  avgCostBasis: number
  totalIncome: number
  loading: boolean
} {
  const [fxRates, setFxRates] = useState<FxRates>({})
  const [loading, setLoading] = useState(false)

  const pairsKey = useMemo(() => {
    const seen = new Set<string>()
    const pairs: Array<{ from: string; to: string; date: string }> = []
    const to = assetCurrency.toUpperCase()
    for (const tx of transactions) {
      const from = tx.currency.toUpperCase()
      if (from === to) continue
      const date = tx.executed_at.slice(0, 10)
      const key = `${from}_${to}_${date}`
      if (!seen.has(key)) {
        seen.add(key)
        pairs.push({ from, to, date })
      }
    }
    return { pairs, key: [...seen].sort().join('|') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.map((t) => `${t.id}:${t.currency}:${t.executed_at}`).join(','), assetCurrency])

  useEffect(() => {
    if (pairsKey.pairs.length === 0) {
      setFxRates({})
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-fx-rates', { body: { pairs: pairsKey.pairs } })
      .then(({ data, error }) => {
        if (!error && data?.rates) setFxRates(data.rates as FxRates)
        setLoading(false)
      })
      .catch(() => { setFxRates({}); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey.key])

  return useMemo(() => {
    const to = assetCurrency.toUpperCase()

    function fx(from: string, date: string): number {
      const f = from.toUpperCase()
      if (f === to) return 1
      return fxRates[`${f}_${to}_${date}`] ?? 1
    }

    let totalBuyValue = 0
    let totalBuyQty = 0
    let totalIncome = 0

    for (const tx of transactions) {
      const qty = Number(tx.quantity)
      const price = Number(tx.price)
      const date = tx.executed_at.slice(0, 10)
      const rate = fx(tx.currency, date)

      if (tx.transaction_type === 'buy' || tx.transaction_type === 'deposit') {
        totalBuyValue += qty * price * rate
        totalBuyQty += qty
      } else if (tx.transaction_type === 'dividend') {
        totalIncome += qty * price * rate
      }
    }

    return {
      avgCostBasis: totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0,
      totalIncome,
      loading,
    }
  }, [transactions, assetCurrency, fxRates, loading])
}
