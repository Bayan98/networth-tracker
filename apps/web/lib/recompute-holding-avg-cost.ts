import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Recomputes and saves the FX-adjusted average cost basis for a holding.
 *
 * Historical FX rates are constants (transaction date never changes), so
 * the result is exact and safe to cache in holdings.average_cost_basis.
 *
 * Call this after any transaction insert / update / delete so the DB stays
 * in sync and all surfaces show the same value without re-fetching transactions.
 */
export async function recomputeAndSaveAvgCost(
  holdingId: string,
  holdingCurrency: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: txs } = await supabase
    .from('transactions')
    .select('quantity, price, currency, executed_at')
    .eq('holding_id', holdingId)
    .in('transaction_type', ['buy', 'deposit'])

  if (!txs || txs.length === 0) {
    await supabase.from('holdings').update({ average_cost_basis: 0 }).eq('id', holdingId)
    return
  }

  const to = holdingCurrency.toUpperCase()
  const seen = new Set<string>()
  const pairs: { from: string; to: string; date: string }[] = []

  for (const tx of txs) {
    const from = (tx.currency as string).toUpperCase()
    if (from === to) continue
    const date = (tx.executed_at as string).slice(0, 10)
    const key = `${from}_${to}_${date}`
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push({ from, to, date })
    }
  }

  let rates: Record<string, number> = {}
  if (pairs.length > 0) {
    const { data } = await supabase.functions.invoke('fetch-fx-rates', { body: { pairs } })
    if (data?.rates) rates = data.rates as Record<string, number>
  }

  let totalValue = 0
  let totalQty = 0

  for (const tx of txs) {
    const from = (tx.currency as string).toUpperCase()
    const date = (tx.executed_at as string).slice(0, 10)
    const rate = from === to ? 1 : (rates[`${from}_${to}_${date}`] ?? 1)
    const qty = Number(tx.quantity)
    totalValue += qty * Number(tx.price) * rate
    totalQty += qty
  }

  const avgCost = totalQty > 0 ? totalValue / totalQty : 0
  await supabase.from('holdings').update({ average_cost_basis: avgCost }).eq('id', holdingId)
}
