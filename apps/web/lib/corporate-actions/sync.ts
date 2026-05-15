import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssetType } from '@networth/types'
import { replayQuantityAt } from '@networth/utils'
import {
  buildCorporateActionMetadata,
  getCorporateActionId,
  getLegacyCorporateActionIds,
} from './metadata'

const SUPPORTED: ReadonlySet<AssetType> = new Set([
  'stock',
  'etf',
  'bond',
  'mutual_fund',
  'commodity',
])

interface SyncAsset {
  id: string
  symbol: string | null
  currency: string
  asset_type: AssetType
}

interface CorporateActionsResponse {
  dividends: Array<{ date: string; amount: number }>
  splits: Array<{ date: string; numerator: number; denominator: number }>
}

interface AssetTx {
  id: string
  transaction_type: string
  quantity: number | string
  executed_at: string
  notes: string | null
  metadata: unknown
}

export async function syncCorporateActions(
  supabase: SupabaseClient,
  asset: SyncAsset,
  userId: string,
): Promise<void> {
  try {
    if (!asset.symbol || !SUPPORTED.has(asset.asset_type)) return

    const { data: txs, error } = await supabase
      .from('transactions')
      .select('id, transaction_type, quantity, executed_at, notes, metadata')
      .eq('asset_id', asset.id)

    if (error || !txs) return

    const rows = txs as AssetTx[]
    let firstBuyDate: string | null = null
    for (const tx of rows) {
      if (tx.transaction_type !== 'buy') continue
      const day = tx.executed_at.slice(0, 10)
      if (firstBuyDate === null || day < firstBuyDate) firstBuyDate = day
    }
    if (!firstBuyDate) return

    const existingIds = new Set<string>()
    for (const tx of rows) {
      if (tx.transaction_type !== 'dividend' && tx.transaction_type !== 'split') continue
      const metadataId = getCorporateActionId(tx.metadata)
      if (metadataId) existingIds.add(metadataId)
      for (const legacyId of getLegacyCorporateActionIds(tx.notes)) existingIds.add(legacyId)
    }

    const { data: caResp, error: caErr } = await supabase.functions.invoke(
      'fetch-corporate-actions',
      {
        body: {
          symbol: asset.symbol.toUpperCase(),
          asset_type: asset.asset_type,
          from_date: firstBuyDate,
        },
      },
    )
    if (caErr || !caResp) return
    const actions = caResp as CorporateActionsResponse

    const inserts: Array<Record<string, unknown>> = []

    for (const ev of actions.splits) {
      if (ev.date < firstBuyDate) continue
      const ts = Math.floor(new Date(ev.date + 'T00:00:00Z').getTime() / 1000)
      const id = `split:${ts}`
      if (existingIds.has(id)) continue
      const quantity = ev.numerator / ev.denominator
      if (!Number.isFinite(quantity) || quantity <= 0) continue
      inserts.push({
        user_id: userId,
        asset_id: asset.id,
        transaction_type: 'split',
        quantity,
        price: 0,
        currency: asset.currency,
        executed_at: new Date(ev.date + 'T12:00:00.000Z').toISOString(),
        notes: null,
        metadata: buildCorporateActionMetadata('split', ts),
      })
    }

    const combined: AssetTx[] = [
      ...rows,
      ...inserts.map((r) => ({
        id: 'pending',
        transaction_type: r.transaction_type as string,
        quantity: r.quantity as number,
        executed_at: r.executed_at as string,
        notes: r.notes as string | null,
        metadata: r.metadata,
      })),
    ]

    for (const ev of actions.dividends) {
      if (ev.date < firstBuyDate) continue
      const ts = Math.floor(new Date(ev.date + 'T00:00:00Z').getTime() / 1000)
      const id = `div:${ts}`
      if (existingIds.has(id)) continue
      const heldQty = replayQuantityAt(combined, ev.date)
      if (heldQty <= 0) continue
      inserts.push({
        user_id: userId,
        asset_id: asset.id,
        transaction_type: 'dividend',
        quantity: heldQty,
        price: ev.amount,
        currency: asset.currency,
        executed_at: new Date(ev.date + 'T12:00:00.000Z').toISOString(),
        notes: null,
        metadata: buildCorporateActionMetadata('dividend', ts),
      })
    }

    if (inserts.length === 0) return

    const { error: insertErr } = await supabase.from('transactions').insert(inserts)
    if (insertErr) console.warn('syncCorporateActions insert failed:', insertErr.message)
  } catch (err) {
    console.warn('syncCorporateActions failed:', err)
  }
}
