'use client'

import { usePrices } from '@/lib/hooks/use-prices'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { useAssetAvgCost } from '@/lib/hooks/use-asset-avg-cost'
import { formatCurrency, formatPercent, resolveAssetPrice } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { Asset, Transaction } from '@networth/types'

interface Props {
  asset: Asset
  transactions: Transaction[]
}

export function AssetMarketStats({ asset, transactions }: Props) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)

  const priceItems =
    asset.symbol
      ? [{ symbol: asset.symbol, asset_type: asset.asset_type }]
      : []

  const { prices } = usePrices(priceItems)
  const { price: rawPrice, source } = resolveAssetPrice(asset, prices)

  const { fx, loading: fxLoading } = useTodayFx([{ currency: 'USD' }], asset.currency)
  const { avgCostBasis, loading: costLoading } = useAssetAvgCost(transactions, asset.currency)

  const price = source === 'live'
    ? rawPrice * fx('USD')
    : source === 'cost_basis' ? avgCostBasis : rawPrice

  const quantity = Number(asset.quantity)
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
      value: hideAmounts ? '••••' : anyLoading ? '…' : formatCurrency(avgCostBasis, asset.currency),
    },
    {
      label: 'Market Value / unit',
      value: hideAmounts ? '••••' : anyLoading ? '…' : formatCurrency(price, asset.currency),
      sub: source === 'live' ? 'live' : source === 'manual' ? 'manual price' : 'avg cost basis',
    },
    {
      label: 'Market Value total',
      value: hideAmounts ? '••••••' : anyLoading ? '…' : formatCurrency(marketValueTotal, asset.currency),
    },
    {
      label: 'Change / unit',
      value: hideAmounts
        ? '••••'
        : hasLiveData
          ? formatCurrency(changeAbs, asset.currency)
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
