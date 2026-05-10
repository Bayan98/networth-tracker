import { createClient } from '@/lib/supabase/server'
import { AssetsClient } from '@/components/assets'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

export default async function AssetsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: portfolios }, { data: assets }, { data: profile }] = await Promise.all([
    supabase.from('portfolios').select('*').eq('user_id', user!.id).order('created_at'),
    supabase.from('assets').select('*').eq('user_id', user!.id).order('created_at'),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ])

  return (
    <AssetsClient
      portfolios={portfolios ?? []}
      assets={assets ?? []}
      currency={(profile?.default_currency ?? 'USD') as CurrencyCode}
      userId={user!.id}
    />
  )
}
