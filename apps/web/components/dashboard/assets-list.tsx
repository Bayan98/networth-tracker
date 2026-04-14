'use client'

import Link from 'next/link'
import { formatCurrency } from '@networth/utils'
import { ASSET_TYPE_LABELS, resolveAssetPrice } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { usePrices } from '@/lib/hooks/use-prices'
import type { Asset, CurrencyCode } from '@networth/types'

interface AssetsListProps {
  assets: Asset[]
  currency: CurrencyCode
  quantityPerAsset: Record<string, number>
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

export function AssetsList({ assets, currency, quantityPerAsset }: AssetsListProps) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const priceItems = assets
    .filter((h) => h.symbol)
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices, loading: pricesLoading } = usePrices(priceItems)
  const { fx, loading: fxLoading } = useTodayFx(assets, selectedCurrency)
  const loading = pricesLoading || fxLoading

  if (assets.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <p className="font-medium mb-1">No assets yet</p>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Add your first portfolio and start tracking.
        </p>
        <Link
          href="/assets"
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
        <h2 className="text-sm font-semibold">Assets</h2>
        <Link
          href="/assets"
          className="text-xs"
          style={{ color: 'var(--color-accent)' }}
        >
          View all
        </Link>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {assets.map((asset) => {
          const qty = quantityPerAsset[asset.id] ?? 0
          const { price, source } = resolveAssetPrice(asset, prices)
          const priceCcy = source === 'live' ? 'USD' : asset.currency
          const value = qty * price * fx(priceCcy)

          return (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: ASSET_TYPE_COLORS[asset.asset_type] + '22', color: ASSET_TYPE_COLORS[asset.asset_type] }}
              >
                {(asset.symbol ?? asset.asset_name).slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{asset.symbol ?? asset.asset_name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                  {asset.asset_name} · {ASSET_TYPE_LABELS[asset.asset_type]}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-medium">
                  {hideAmounts ? '••••••' : loading ? '—' : formatCurrency(value, selectedCurrency)}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {qty.toLocaleString('en-US', { maximumFractionDigits: 4 })} units
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
