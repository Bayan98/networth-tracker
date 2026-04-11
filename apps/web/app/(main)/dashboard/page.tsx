import { createClient } from '@/lib/supabase/server'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { NetWorthChart } from '@/components/dashboard/net-worth-chart'
import { AllocationChart } from '@/components/dashboard/allocation-chart'
import { AssetsList } from '@/components/dashboard/assets-list'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300 // 5 min

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: portfolios }, { data: assets }, { data: debts }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      supabase.from('portfolios').select('*').eq('user_id', user!.id),
      supabase.from('assets').select('*').eq('user_id', user!.id),
      supabase.from('debts').select('*').eq('user_id', user!.id).eq('is_active', true),
    ])

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
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <NetWorthChart currency={currency} />
        </div>
        <AllocationChart assets={assets ?? []} currency={currency} />
      </div>

      <AssetsList assets={assets ?? []} currency={currency} />
    </div>
  )
}
