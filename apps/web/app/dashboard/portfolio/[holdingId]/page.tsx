import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@networth/utils'
import { ASSET_TYPE_LABELS } from '@networth/utils'

interface Props {
  params: Promise<{ holdingId: string }>
}

export default async function HoldingDetailPage({ params }: Props) {
  const { holdingId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: holding }, { data: transactions }] = await Promise.all([
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
  ])

  if (!holding) notFound()

  const totalValue = Number(holding.quantity) * Number(holding.average_cost_basis)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">{holding.symbol}</h1>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            {ASSET_TYPE_LABELS[holding.asset_type]}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {holding.asset_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Quantity', value: Number(holding.quantity).toFixed(4) },
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

      {/* Transactions */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold">Transaction History</h2>
        </div>

        {(transactions ?? []).length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No transactions recorded.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Date', 'Type', 'Quantity', 'Price', 'Total', 'Fee'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left font-medium"
                    style={{ color: 'var(--color-muted-foreground)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions!.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-white/5"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-5 py-3">
                    {new Date(tx.executed_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 capitalize">{tx.transaction_type}</td>
                  <td className="px-5 py-3">{Number(tx.quantity).toFixed(4)}</td>
                  <td className="px-5 py-3">
                    {formatCurrency(Number(tx.price_per_unit), tx.currency)}
                  </td>
                  <td className="px-5 py-3">
                    {formatCurrency(Number(tx.total_amount), tx.currency)}
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                    {Number(tx.fee) > 0 ? formatCurrency(Number(tx.fee), tx.currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
