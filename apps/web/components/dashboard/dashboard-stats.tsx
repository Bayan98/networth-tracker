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
  const { prices, currencies, loading: pricesLoading } = usePrices(priceItems)
  const { fx, loading: fxLoading } = useTodayFx(assets, selectedCurrency)
  const loading = pricesLoading || fxLoading

  const totalAssets = assets.reduce<number | null>((sum, h) => {
    if (sum === null) return null
    const { price, source } = resolveAssetPrice(h, prices)
    const priceCcy = source === 'live' ? (currencies[h.symbol?.toUpperCase() ?? ''] ?? 'USD') : h.currency
    const rate = fx(priceCcy)
    return rate !== null ? sum + (quantityPerAsset[h.id] ?? 0) * price * rate : null
  }, 0)

  const totalDebt = debts.reduce<number | null>((sum, d) => {
    if (sum === null) return null
    const rate = fx(d.currency)
    return rate !== null ? sum + Number(d.current_balance) * rate : null
  }, 0)
  const netWorth = totalAssets !== null && totalDebt !== null ? totalAssets - totalDebt : null

  const usingLivePrices = !loading && Object.keys(prices).length > 0
  const skeleton = <span className="inline-block w-20 h-4 rounded animate-pulse" style={{ background: 'var(--color-muted)' }} />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Assets"
        value={loading ? skeleton : totalAssets !== null ? <MaskedAmount amount={totalAssets} currency={selectedCurrency} /> : '—'}
        change={usingLivePrices ? <span style={{ color: 'var(--color-muted-foreground)' }}>live</span> : undefined}
        icon={<TrendingUp size={16} />}
      />
      <StatCard
        label="Total Debt"
        value={loading ? skeleton : totalDebt !== null ? <MaskedAmount amount={totalDebt} currency={selectedCurrency} /> : '—'}
        icon={<TrendingDown size={16} />}
      />
      <StatCard
        label="Net Worth"
        value={loading ? skeleton : netWorth !== null ? (
          <span style={{ color: netWorth >= 0 ? 'var(--color-accent)' : '#ef4444' }}>
            <MaskedAmount amount={netWorth} currency={selectedCurrency} />
          </span>
        ) : '—'}
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
