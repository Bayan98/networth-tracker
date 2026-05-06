'use server'

import { createClient } from '@/lib/supabase/server'
import type { ImportRow } from '@networth/utils'
import type { AssetType, TransactionType } from '@networth/types'

export interface ImportResult {
  assetsCreated: number
  transactionsCreated: number
  errors: string[]
}

export async function importAssets(
  rows: ImportRow[],
  portfolioId: string | null,
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const result: ImportResult = { assetsCreated: 0, transactionsCreated: 0, errors: [] }

  // Group rows by asset: symbol takes priority over name for dedup within the batch
  const groups = new Map<string, ImportRow[]>()
  for (const row of rows) {
    const key = (row.symbol || row.asset_name).toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  for (const [, groupRows] of groups) {
    const firstRow = groupRows[0]
    let assetId: string | null = null

    // Reuse existing asset when symbol + portfolioId uniquely identifies it
    if (firstRow.symbol && portfolioId) {
      const { data } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', firstRow.symbol.toUpperCase())
        .eq('portfolio_id', portfolioId)
        .maybeSingle()
      assetId = data?.id ?? null
    }

    if (!assetId) {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          portfolio_id: portfolioId,
          asset_name: firstRow.asset_name,
          symbol: firstRow.symbol ? firstRow.symbol.toUpperCase() : null,
          asset_type: firstRow.asset_type as AssetType,
          currency: firstRow.currency || 'USD',
          notes: firstRow.notes || null,
        })
        .select('id')
        .single()

      if (error) {
        result.errors.push(`Failed to create "${firstRow.asset_name}": ${error.message}`)
        continue
      }
      assetId = data.id
      result.assetsCreated++
    }

    // First row without transaction_type that has a price sets the manual_price
    const manualRow = groupRows.find(r => !r.transaction_type && r.price)
    if (manualRow) {
      const { error } = await supabase
        .from('assets')
        .update({
          manual_price: Number(manualRow.price),
          manual_price_date: manualRow.date || new Date().toISOString().split('T')[0],
        })
        .eq('id', assetId)
      if (error) {
        result.errors.push(`Failed to set manual price for "${firstRow.asset_name}": ${error.message}`)
      }
    }

    // Create a transaction for every row that has a transaction_type
    for (const row of groupRows.filter(r => r.transaction_type)) {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        asset_id: assetId,
        transaction_type: row.transaction_type as TransactionType,
        quantity: Number(row.quantity),
        price: Number(row.price),
        currency: row.currency || 'USD',
        executed_at: row.date ? `${row.date}T00:00:00Z` : new Date().toISOString(),
        notes: row.notes || null,
      })

      if (error) {
        result.errors.push(
          `Transaction for "${row.asset_name}" (${row.transaction_type}): ${error.message}`,
        )
      } else {
        result.transactionsCreated++
      }
    }
  }

  return result
}

export async function deleteAllUserData(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const tables = [
    ['scheduled_events', 'scheduled events'],
    ['transactions', 'transactions'],
    ['debts', 'debts'],
    ['assets', 'assets'],
    ['portfolios', 'portfolios'],
  ] as const

  for (const [table, label] of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', user.id)
    if (error) return { error: `Failed to delete ${label}: ${error.message}` }
  }

  return { error: null }
}
