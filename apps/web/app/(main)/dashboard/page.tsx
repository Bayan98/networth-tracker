import { createClient } from '@/lib/supabase/server'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { PortfolioChart } from '@/components/assets/portfolio-chart'
import { AllocationChart } from '@/components/dashboard/allocation-chart'
import { AssetsList } from '@/components/dashboard/assets-list'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300 // 5 min

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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
          Your financial overview
        </p>
      </div>

      <DashboardStats
        assets={assets ?? []}
        debts={debts ?? []}
        portfolioCount={(portfolios ?? []).length}
        currency={currency}
        quantityPerAsset={quantityPerAsset}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PortfolioChart assets={assets ?? []} currency={currency} />
        </div>
        <AllocationChart assets={assets ?? []} currency={currency} quantityPerAsset={quantityPerAsset} />
      </div>

      <AssetsList assets={assets ?? []} currency={currency} quantityPerAsset={quantityPerAsset} />
    </div>
  )
}
