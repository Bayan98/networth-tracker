'use client'

import { usePrices } from '@/lib/hooks/use-prices'
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

  const { prices, currencies } = usePrices(priceItems)
  const { price: rawPrice, source } = resolveAssetPrice(asset, prices)

  const { avgCostBasis, quantity, fx, loading, fxError } = useAssetAvgCost(transactions, asset.currency)

  const priceCcy = source === 'live' ? (currencies[asset.symbol?.toUpperCase() ?? ''] ?? 'USD') : asset.currency
  const fxRate = source === 'live' ? fx(priceCcy) : null
  const price: number | null = source === 'live'
    ? (fxRate !== null ? rawPrice * fxRate : null)
    : source === 'cost_basis' ? avgCostBasis : rawPrice

  const marketValueTotal = price !== null ? quantity * price : null
  const changeAbs = price !== null ? price - avgCostBasis : null
  const changePct = changeAbs !== null && avgCostBasis > 0 ? (changeAbs / avgCostBasis) * 100 : null
  const hasLiveData = source !== 'cost_basis'

  const changeColor = !hasLiveData || changePct === null
    ? undefined
    : changePct >= 0 ? '#22c55e' : '#ef4444'

  const stats = [
    {
      label: 'Quantity',
      value: hideAmounts ? '••••' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(quantity),
    },
    {
      label: 'Avg Buy Price',
      value: hideAmounts ? '••••' : loading ? '…' : formatCurrency(avgCostBasis, asset.currency),
    },
    {
      label: 'Market Value / unit',
      value: hideAmounts ? '••••' : loading ? '…' : price !== null ? formatCurrency(price, asset.currency) : '—',
      sub: source === 'live' ? 'live' : source === 'manual' ? 'manual price' : 'avg cost basis',
    },
    {
      label: 'Market Value total',
      value: hideAmounts ? '••••••' : loading ? '…' : marketValueTotal !== null ? formatCurrency(marketValueTotal, asset.currency) : '—',
    },
    {
      label: 'Change / unit',
      value: hideAmounts
        ? '••••'
        : hasLiveData && changeAbs !== null
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
      {fxError && (
        <div
          className="col-span-2 sm:col-span-3 lg:col-span-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400"
        >
          {fxError}
        </div>
      )}
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
