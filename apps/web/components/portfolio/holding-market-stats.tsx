'use client'

import { usePrices } from '@/lib/hooks/use-prices'
import { formatCurrency, formatPercent, resolveHoldingPrice } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { Holding } from '@networth/types'

interface Props {
  holding: Holding
}

export function HoldingMarketStats({ holding }: Props) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)

  const priceItems =
    holding.symbol
      ? [{ symbol: holding.symbol, asset_type: holding.asset_type }]
      : []

  const { prices } = usePrices(priceItems)
  const { price, source } = resolveHoldingPrice(holding, prices)

  const avgCost = Number(holding.average_cost_basis)
  const quantity = Number(holding.quantity)
  const marketValueTotal = quantity * price
  const changeAbs = price - avgCost
  const changePct = avgCost > 0 ? (changeAbs / avgCost) * 100 : null
  const hasLiveData = source !== 'cost_basis'

  const changeColor = !hasLiveData || changePct === null
    ? undefined
    : changePct >= 0 ? '#22c55e' : '#ef4444'

  const stats = [
    {
      label: 'Market Value / unit',
      value: hideAmounts ? '••••' : formatCurrency(price, holding.currency),
      sub: source === 'live' ? 'live' : source === 'manual' ? 'manual price' : 'avg cost basis',
    },
    {
      label: 'Market Value total',
      value: hideAmounts ? '••••••' : formatCurrency(marketValueTotal, holding.currency),
    },
    {
      label: 'Change / unit',
      value: hideAmounts
        ? '••••'
        : hasLiveData
          ? formatCurrency(changeAbs, holding.currency)
          : '—',
      color: changeColor,
    },
    {
      label: 'Change %',
      value: hideAmounts
        ? '••••'
        : hasLiveData && changePct !== null
          ? formatPercent(changePct)
          : '—',
      color: changeColor,
    },
  ]

  return (
    <>
      {stats.map(({ label, value, sub, color }) => (
        <div
          key={label}
          className="p-4 rounded-xl"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {label}
          </p>
          <p className="font-semibold" style={color ? { color } : undefined}>
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              {sub}
            </p>
          )}
        </div>
      ))}
    </>
  )
}
