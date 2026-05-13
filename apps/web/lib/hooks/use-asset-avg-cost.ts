'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@networth/types'
import { lookupFxRate } from '@networth/utils'
import type { FxRates } from '@networth/utils'

export function useAssetAvgCost(
  transactions: Transaction[],
  assetCurrency: string,
): {
  avgCostBasis: number
  totalIncome: number
  quantity: number
  fx: (from: string) => number | null
  loading: boolean
  fxError: string | null
} {
  const [fxRates, setFxRates] = useState<FxRates>({})
  const [loading, setLoading] = useState(true)
  const [fxError, setFxError] = useState<string | null>(null)

  const pairsKey = useMemo(() => {
    const seen = new Set<string>()
    const pairs: Array<{ from: string; to: string; date: string }> = []
    const to = assetCurrency.toUpperCase()
    const today = new Date().toISOString().slice(0, 10)

    if ('USD' !== to) {
      const key = `USD_${to}_${today}`
      seen.add(key)
      pairs.push({ from: 'USD', to, date: today })
    }

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
      setLoading(false)
      return
    }
    setLoading(true)
    setFxError(null)
    const supabase = createClient()
    supabase.functions
      .invoke('fetch-fx-rates', { body: { pairs: pairsKey.pairs } })
      .then(({ data, error }) => {
        if (error || !data?.rates) {
          console.error('[FX] fetch-fx-rates failed:', error)
          setFxError('Failed to load exchange rates')
          setFxRates({})
        } else {
          const fetched = data.rates as FxRates
          const missing = pairsKey.pairs.filter((p) => !(`${p.from}_${p.to}_${p.date}` in fetched))
          if (missing.length > 0) {
            console.error('[FX] Missing rates for pairs:', missing)
            setFxError('Some exchange rates are unavailable — asset values may be incorrect')
          }
          setFxRates(fetched)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('[FX] fetch-fx-rates exception:', err)
        setFxError('Failed to load exchange rates')
        setFxRates({})
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey.key])

  return useMemo(() => {
    const to = assetCurrency.toUpperCase()
    const today = new Date().toISOString().slice(0, 10)

    function fxAt(from: string, date: string): number | null {
      return lookupFxRate(fxRates, from, to, date)
    }

    function fx(from: string): number | null {
      return fxAt(from, today)
    }

    let totalBuyValue = 0
    let totalBuyQty = 0
    let totalIncome = 0
    let quantity = 0

    const sorted = [...transactions].sort((a, b) => a.executed_at.localeCompare(b.executed_at))
    for (const tx of sorted) {
      const qty = Number(tx.quantity)
      const price = Number(tx.price)
      const date = tx.executed_at.slice(0, 10)
      const rate = fxAt(tx.currency, date)

      if (tx.transaction_type === 'buy' || tx.transaction_type === 'deposit') {
        if (rate !== null) {
          totalBuyValue += qty * price * rate
          totalBuyQty += qty
        }
        quantity += qty
      } else if (tx.transaction_type === 'sell') {
        const avg = totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0
        if (rate !== null) totalIncome += qty * (price * rate - avg)
        totalBuyValue -= qty * avg
        totalBuyQty -= qty
        quantity -= qty
      } else if (tx.transaction_type === 'withdrawal') {
        const avg = totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0
        totalBuyValue -= qty * avg
        totalBuyQty -= qty
        quantity -= qty
      } else if (tx.transaction_type === 'split') {
        quantity *= qty
        totalBuyQty *= qty
      } else if (tx.transaction_type === 'dividend') {
        if (rate !== null) totalIncome += qty * price * rate
      }
    }

    return {
      avgCostBasis: totalBuyQty > 0 ? totalBuyValue / totalBuyQty : 0,
      totalIncome,
      quantity,
      fx,
      loading,
      fxError,
    }
  }, [transactions, assetCurrency, fxRates, loading, fxError])
}
