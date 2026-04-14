import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AssetTransactionSection } from '@/components/assets/asset-transaction-section'
import { AssetScheduledEventsSection } from '@/components/assets/asset-scheduled-events-section'
import { AssetDetailHeader } from '@/components/assets/asset-detail-header'
import { AssetMarketStats } from '@/components/assets/asset-market-stats'

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
    supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('asset_id', assetId)
      .eq('user_id', user!.id)
      .order('executed_at', { ascending: false }),
    supabase
      .from('scheduled_events')
      .select('*')
      .eq('asset_id', assetId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user!.id),
  ])

  if (!asset) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1 text-sm mb-3"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <ChevronLeft size={14} /> Assets
        </Link>
        <AssetDetailHeader asset={asset} portfolios={portfolios ?? []} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <AssetMarketStats asset={asset} transactions={transactions ?? []} />
      </div>

      <AssetScheduledEventsSection
        events={scheduledEvents ?? []}
        assetId={assetId}
        userId={user!.id}
        currency={asset.currency}
      />

      <AssetTransactionSection
        transactions={transactions ?? []}
        assetId={assetId}
        currency={asset.currency}
        userId={user!.id}
      />
    </div>
  )
}
