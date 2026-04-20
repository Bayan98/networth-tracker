'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { usePrices } from '@/lib/hooks/use-prices'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { useAppStore } from '@/lib/store'
import { ASSET_TYPE_LABELS, resolveAssetPrice } from '@networth/utils'
import type { Asset, CurrencyCode } from '@networth/types'

const ASSET_COLORS: Record<string, string> = {
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

interface Props {
  assets: Asset[]
  currency: CurrencyCode
  quantityPerAsset: Record<string, number>
}

export function AllocationChart({ assets, currency, quantityPerAsset }: Props) {
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const priceItems = assets
    .filter((h) => h.symbol)
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices } = usePrices(priceItems)
  const { fx, loading: fxLoading } = useTodayFx(assets, selectedCurrency)

  if (fxLoading) {
    return (
      <div
        className="rounded-xl p-5 h-64 flex flex-col"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold mb-4">Allocation</h2>
        <div className="flex-1 rounded-lg animate-pulse" style={{ background: 'var(--color-muted)' }} />
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div
        className="rounded-xl p-5 h-64 flex flex-col"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold mb-4">Allocation</h2>
        <div
          className="flex-1 flex items-center justify-center"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <p className="text-sm">Add assets to see your allocation.</p>
        </div>
      </div>
    )
  }

  const byType = new Map<string, number>()
  for (const h of assets) {
    const { price, source } = resolveAssetPrice(h, prices)
    const priceCcy = source === 'live' ? 'USD' : h.currency
    const rate = fx(priceCcy)
    if (rate === null) continue
    const value = (quantityPerAsset[h.id] ?? 0) * price * rate
    byType.set(h.asset_type, (byType.get(h.asset_type) ?? 0) + value)
  }

  const data = Array.from(byType.entries())
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: ASSET_TYPE_LABELS[type] ?? type,
      value,
      color: ASSET_COLORS[type] ?? '#71717a',
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div
      className="rounded-xl p-5 h-64 flex flex-col"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <h2 className="text-sm font-semibold mb-2">Allocation</h2>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="40%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: 12,
              }}
              formatter={(value: number) => [
                `${((value / total) * 100).toFixed(1)}%`,
              ]}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
