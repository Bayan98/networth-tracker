'use client'

import { usePrices } from '@/lib/hooks/use-prices'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { useHoldingAvgCost } from '@/lib/hooks/use-holding-avg-cost'
import { formatCurrency, formatPercent, resolveHoldingPrice } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { Holding, Transaction } from '@networth/types'

interface Props {
  holding: Holding
  transactions: Transaction[]
}

export function HoldingMarketStats({ holding, transactions }: Props) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)

  const priceItems =
    holding.symbol
      ? [{ symbol: holding.symbol, asset_type: holding.asset_type }]
      : []

  const { prices } = usePrices(priceItems)
  const { price: rawPrice, source } = resolveHoldingPrice(holding, prices)

  const { fx, loading: fxLoading } = useTodayFx([{ currency: 'USD' }], holding.currency)
  const { avgCostBasis, loading: costLoading } = useHoldingAvgCost(transactions, holding.currency)

  const price = source === 'live'
    ? rawPrice * fx('USD')
    : source === 'cost_basis' ? avgCostBasis : rawPrice

  const quantity = Number(holding.quantity)
  const marketValueTotal = quantity * price
  const changeAbs = price - avgCostBasis
  const changePct = avgCostBasis > 0 ? (changeAbs / avgCostBasis) * 100 : null
  const hasLiveData = source !== 'cost_basis'

  const changeColor = !hasLiveData || changePct === null
    ? undefined
    : changePct >= 0 ? '#22c55e' : '#ef4444'

  const anyLoading = fxLoading || costLoading

  const stats = [
    {
      label: 'Avg Buy Price',
      value: hideAmounts ? '••••' : anyLoading ? '…' : formatCurrency(avgCostBasis, holding.currency),
    },
    {
      label: 'Market Value / unit',
      value: hideAmounts ? '••••' : anyLoading ? '…' : formatCurrency(price, holding.currency),
      sub: source === 'live' ? 'live' : source === 'manual' ? 'manual price' : 'avg cost basis',
    },
    {
      label: 'Market Value total',
      value: hideAmounts ? '••••••' : anyLoading ? '…' : formatCurrency(marketValueTotal, holding.currency),
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
