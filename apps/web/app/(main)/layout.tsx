import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { ThemeApplier } from '@/components/dashboard/theme-applier'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [
    { data: profile },
    { data: portfolios },
    { count: assetCount },
    { count: incomeCount },
    { count: debtCount },
    { data: assetsByPortfolio },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('portfolios').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('scheduled_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true).neq('transaction_type', 'withdrawal'),
    supabase.from('debts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
    supabase.from('assets').select('portfolio_id').eq('user_id', user.id),
  ])

  const portfolioAssetCounts: Record<string, number> = {}
  for (const a of assetsByPortfolio ?? []) {
    if (a.portfolio_id) {
      portfolioAssetCounts[a.portfolio_id] = (portfolioAssetCounts[a.portfolio_id] ?? 0) + 1
    }
  }

  return (
    <div className="app-shell">
      <ThemeApplier />
      <Sidebar
        user={profile}
        portfolios={portfolios ?? []}
        counts={{ assets: assetCount ?? 0, income: incomeCount ?? 0, debts: debtCount ?? 0 }}
        portfolioAssetCounts={portfolioAssetCounts}
      />
      <div className="main-area">
        <Header user={profile} />
        <main className="page-content">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
