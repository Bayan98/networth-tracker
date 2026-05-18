import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: portfolios }, { data: assets }, { data: debts }, { data: transactions }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      supabase.from('portfolios').select('*').eq('user_id', user!.id),
      supabase.from('assets').select('*').eq('user_id', user!.id),
      supabase.from('debts').select('*').eq('user_id', user!.id).eq('is_active', true),
      supabase.from('transactions').select('asset_id, quantity, transaction_type').eq('user_id', user!.id).order('executed_at', { ascending: true }),
    ])

  const quantityPerAsset: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    const qty = Number(tx.quantity)
    if (tx.transaction_type === 'buy' || tx.transaction_type === 'deposit') {
      quantityPerAsset[tx.asset_id] = (quantityPerAsset[tx.asset_id] ?? 0) + qty
    } else if (tx.transaction_type === 'sell' || tx.transaction_type === 'withdrawal') {
      quantityPerAsset[tx.asset_id] = (quantityPerAsset[tx.asset_id] ?? 0) - qty
    } else if (tx.transaction_type === 'split') {
      quantityPerAsset[tx.asset_id] = (quantityPerAsset[tx.asset_id] ?? 0) * qty
    }
  }

  const currency: CurrencyCode = profile?.default_currency ?? 'USD'

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">Overview · Net worth ledger</div>
          <h1>Your money at a glance.</h1>
          <p>Market value, income, allocation, and concentration in one workspace.</p>
        </div>
      </div>
      <DashboardClient
        assets={assets ?? []}
        portfolios={portfolios ?? []}
        debts={debts ?? []}
        quantityPerAsset={quantityPerAsset}
        currency={currency}
      />
    </>
  )
}
