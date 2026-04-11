import { createClient } from '@/lib/supabase/server'
import { PortfolioClient } from '@/components/assets/portfolio-client'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

export default async function PortfolioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: portfolios }, { data: assets }, { data: profile }] = await Promise.all([
    supabase.from('portfolios').select('*').eq('user_id', user!.id).order('created_at'),
    supabase.from('assets').select('*').eq('user_id', user!.id).order('created_at'),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PortfolioClient
        portfolios={portfolios ?? []}
        assets={assets ?? []}
        currency={(profile?.default_currency ?? 'USD') as CurrencyCode}
        userId={user!.id}
      />
    </div>
  )
}
