import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@networth/utils'
import { HoldingTransactionSection } from '@/components/portfolio/holding-transaction-section'
import { HoldingScheduledEventsSection } from '@/components/portfolio/holding-scheduled-events-section'
import { HoldingDetailHeader } from '@/components/portfolio/holding-detail-header'

interface Props {
  params: Promise<{ holdingId: string }>
}

export default async function HoldingDetailPage({ params }: Props) {
  const { holdingId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: holding }, { data: transactions }, { data: scheduledEvents }, { data: portfolios }] = await Promise.all([
    supabase
      .from('holdings')
      .select('*')
      .eq('id', holdingId)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('holding_id', holdingId)
      .eq('user_id', user!.id)
      .order('executed_at', { ascending: false }),
    supabase
      .from('scheduled_events')
      .select('*')
      .eq('holding_id', holdingId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user!.id),
  ])

  if (!holding) notFound()

  const totalValue = Number(holding.quantity) * Number(holding.average_cost_basis)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/holdings"
          className="inline-flex items-center gap-1 text-sm mb-3"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <ChevronLeft size={14} /> Holdings
        </Link>
        <HoldingDetailHeader holding={holding} portfolios={portfolios ?? []} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Quantity', value: Number(holding.quantity).toLocaleString('en-US', { maximumFractionDigits: 6 }) },
          { label: 'Avg Cost', value: formatCurrency(Number(holding.average_cost_basis), holding.currency) },
          { label: 'Total Cost', value: formatCurrency(totalValue, holding.currency) },
          { label: 'Currency', value: holding.currency },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="p-4 rounded-xl"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
              {label}
            </p>
            <p className="font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <HoldingScheduledEventsSection
        events={scheduledEvents ?? []}
        holdingId={holdingId}
        userId={user!.id}
        currency={holding.currency}
      />

      <HoldingTransactionSection
        transactions={transactions ?? []}
        holdingId={holdingId}
        currency={holding.currency}
        userId={user!.id}
      />
    </div>
  )
}
