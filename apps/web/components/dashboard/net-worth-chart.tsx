'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatCompact } from '@networth/utils'
import type { CurrencyCode } from '@networth/types'
import { CHART_TOOLTIP_STYLE } from '@/components/ui/area-chart'

interface ChartPoint {
  date: string
  value: number
}

interface Props {
  currency: CurrencyCode
}

function buildMonthlyPoints(
  transactions: Array<{ executed_at: string; quantity: number; price: number; transaction_type: string }>,
): ChartPoint[] {
  if (transactions.length === 0) return []

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime(),
  )

  const monthly = new Map<string, number>()
  let running = 0

  for (const tx of sorted) {
    const d = new Date(tx.executed_at)
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const amount = Number(tx.quantity) * Number(tx.price)

    if (['buy', 'deposit'].includes(tx.transaction_type)) {
      running += amount
    } else if (['sell', 'withdrawal'].includes(tx.transaction_type)) {
      running -= amount
    }

    monthly.set(label, running)
  }

  const now = new Date()
  const currentLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (!monthly.has(currentLabel) && running > 0) {
    monthly.set(currentLabel, running)
  }

  return Array.from(monthly.entries()).map(([date, value]) => ({ date, value }))
}

function formatXAxis(tick: string) {
  const [year, month] = tick.split('-')
  const d = new Date(Number(year), Number(month) - 1)
  return d.toLocaleString('default', { month: 'short', year: '2-digit' })
}

export function NetWorthChart({ currency }: Props) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: transactions } = await supabase
        .from('transactions')
        .select('executed_at, quantity, price, transaction_type')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: true })

      setData(buildMonthlyPoints(transactions ?? []))
      setLoading(false)
    }

    load()
  }, [])

  const isEmpty = !loading && data.length === 0

  return (
    <div
      className="rounded-xl p-5 h-64 flex flex-col"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <h2 className="text-sm font-semibold mb-4">Net Worth Over Time</h2>

      {isEmpty ? (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <p className="text-sm">Add transactions to see your chart.</p>
        </div>
      ) : loading ? (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <p className="text-sm">Loading…</p>
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompact(v, currency)}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={formatXAxis}
                formatter={(value: number) => [formatCurrency(value, currency), 'Invested']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#netWorthGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
