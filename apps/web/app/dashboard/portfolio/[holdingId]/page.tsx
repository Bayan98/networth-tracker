import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, ASSET_TYPE_LABELS } from '@networth/utils'
import { HoldingTransactionSection } from '@/components/portfolio/holding-transaction-section'

interface Props {
  params: Promise<{ holdingId: string }>
}

export default async function HoldingDetailPage({ params }: Props) {
  const { holdingId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: holding }, { data: transactions }, { data: portfolios }] = await Promise.all([
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
    supabase.from('portfolios').select('*').eq('user_id', user!.id),
  ])

  if (!holding) notFound()

  const totalValue = Number(holding.quantity) * Number(holding.average_cost_basis)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/portfolio"
          className="inline-flex items-center gap-1 text-sm mb-3"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <ChevronLeft size={14} /> Holdings
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">{holding.symbol ?? holding.asset_name}</h1>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            {ASSET_TYPE_LABELS[holding.asset_type] ?? holding.asset_type}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {holding.asset_name}
        </p>
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

      <HoldingTransactionSection
        transactions={transactions ?? []}
        portfolios={portfolios ?? []}
        holdingId={holdingId}
        currency={holding.currency}
        userId={user!.id}
      />
    </div>
  )
}
