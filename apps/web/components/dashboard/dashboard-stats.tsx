'use client'

import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { MaskedAmount } from '@/components/ui/masked-amount'
import { usePrices } from '@/lib/hooks/use-prices'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { useAppStore } from '@/lib/store'
import { formatCurrency, resolveAssetPrice } from '@networth/utils'
import type { Asset, Debt, CurrencyCode } from '@networth/types'

interface Props {
  assets: Asset[]
  debts: Debt[]
  portfolioCount: number
  currency: CurrencyCode
  quantityPerAsset: Record<string, number>
}

export function DashboardStats({ assets, debts, portfolioCount, currency, quantityPerAsset }: Props) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const priceItems = assets
    .filter((h) => h.symbol)
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices, loading: pricesLoading } = usePrices(priceItems)
  const { fx, loading: fxLoading } = useTodayFx(assets, selectedCurrency)
  const loading = pricesLoading || fxLoading

  const totalAssets = assets.reduce((sum, h) => {
    const { price, source } = resolveAssetPrice(h, prices)
    const priceCcy = source === 'live' ? 'USD' : h.currency
    return sum + (quantityPerAsset[h.id] ?? 0) * price * fx(priceCcy)
  }, 0)

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.current_balance) * fx(d.currency), 0)
  const netWorth = totalAssets - totalDebt

  const usingLivePrices = !loading && Object.keys(prices).length > 0
  const skeleton = <span className="inline-block w-20 h-4 rounded animate-pulse" style={{ background: 'var(--color-muted)' }} />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Assets"
        value={loading ? skeleton : <MaskedAmount amount={totalAssets} currency={selectedCurrency} />}
        change={usingLivePrices ? <span style={{ color: 'var(--color-muted-foreground)' }}>live</span> : undefined}
        icon={<TrendingUp size={16} />}
      />
      <StatCard
        label="Total Debt"
        value={loading ? skeleton : <MaskedAmount amount={totalDebt} currency={selectedCurrency} />}
        icon={<TrendingDown size={16} />}
      />
      <StatCard
        label="Net Worth"
        value={loading ? skeleton : (
          <span style={{ color: netWorth >= 0 ? 'var(--color-accent)' : '#ef4444' }}>
            <MaskedAmount amount={netWorth} currency={selectedCurrency} />
          </span>
        )}
        icon={<Wallet size={16} />}
      />
      <StatCard
        label="Portfolios"
        value={portfolioCount}
        change={
          <span style={{ color: 'var(--color-muted-foreground)' }}>
            {assets.length} assets
          </span>
        }
        icon={<PiggyBank size={16} />}
      />
    </div>
  )
}
