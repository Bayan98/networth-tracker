import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssetsClient } from '@/components/assets'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

interface Props {
  params: Promise<{ id: string }>
}

export default async function PortfolioPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: portfolio }, { data: portfolios }, { data: assets }, { data: profile }] =
    await Promise.all([
      supabase.from('portfolios').select('*').eq('id', id).eq('user_id', user!.id).single(),
      supabase.from('portfolios').select('*').eq('user_id', user!.id).order('created_at'),
      supabase.from('assets').select('*').eq('user_id', user!.id).order('created_at'),
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
    ])

  if (!portfolio) {
    notFound()
  }

  return (
    <AssetsClient
      portfolios={portfolios ?? []}
      assets={assets ?? []}
      currency={(profile?.default_currency ?? 'USD') as CurrencyCode}
      userId={user!.id}
      initialPortfolioId={id}
      portfolioName={portfolio.name}
    />
  )
}
