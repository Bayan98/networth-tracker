'use client'

import Link from 'next/link'
import { formatCurrency } from '@networth/utils'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import type { Holding, CurrencyCode } from '@networth/types'

interface HoldingsListProps {
  holdings: Holding[]
  currency: CurrencyCode
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  stock: '#6366f1',
  crypto: '#f59e0b',
  etf: '#22c55e',
  bond: '#3b82f6',
  cash: '#a1a1aa',
  mutual_fund: '#8b5cf6',
  real_estate: '#ec4899',
  commodity: '#f97316',
  other: '#71717a',
}

export function HoldingsList({ holdings, currency }: HoldingsListProps) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const { fx, loading: fxLoading } = useTodayFx(holdings, selectedCurrency)

  if (holdings.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <p className="font-medium mb-1">No holdings yet</p>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Add your first portfolio and start tracking.
        </p>
        <Link
          href="/holdings"
          className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          Add Portfolio
        </Link>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold">Holdings</h2>
        <Link
          href="/holdings"
          className="text-xs"
          style={{ color: 'var(--color-accent)' }}
        >
          View all
        </Link>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {holdings.map((holding) => (
          <Link
            key={holding.id}
            href={`/holdings/${holding.id}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: ASSET_TYPE_COLORS[holding.asset_type] + '22', color: ASSET_TYPE_COLORS[holding.asset_type] }}
            >
              {(holding.symbol ?? holding.asset_name).slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{holding.symbol ?? holding.asset_name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                {holding.asset_name} · {ASSET_TYPE_LABELS[holding.asset_type]}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-medium">
                {hideAmounts ? '••••••' : fxLoading ? '—' : formatCurrency(Number(holding.quantity) * Number(holding.average_cost_basis) * fx(holding.currency), selectedCurrency)}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {Number(holding.quantity).toFixed(4)} units
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
