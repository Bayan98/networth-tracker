import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssetDetailClient } from '@/components/assets/asset-detail-client'

interface Props {
  params: Promise<{ assetId: string }>
}

export default async function AssetDetailPage({ params }: Props) {
  const { assetId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: asset }, { data: transactions }, { data: scheduledEvents }, { data: portfolios }] = await Promise.all([
    supabase.from('assets').select('*').eq('id', assetId).eq('user_id', user!.id).single(),
    supabase.from('transactions').select('*').eq('asset_id', assetId).eq('user_id', user!.id).order('executed_at', { ascending: false }),
    supabase.from('scheduled_events').select('*').eq('asset_id', assetId).eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('portfolios').select('*').eq('user_id', user!.id),
  ])

  if (!asset) notFound()

  return (
    <AssetDetailClient
      asset={asset}
      transactions={transactions ?? []}
      scheduledEvents={scheduledEvents ?? []}
      portfolios={portfolios ?? []}
      userId={user!.id}
    />
  )
}
