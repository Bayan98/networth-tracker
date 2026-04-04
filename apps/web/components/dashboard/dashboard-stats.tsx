'use client'

import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { MaskedAmount } from '@/components/ui/masked-amount'
import { usePrices } from '@/lib/hooks/use-prices'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@networth/utils'
import type { Holding, Debt, CurrencyCode } from '@networth/types'

interface Props {
  holdings: Holding[]
  debts: Debt[]
  portfolioCount: number
  currency: CurrencyCode
}

export function DashboardStats({ holdings, debts, portfolioCount, currency }: Props) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const priceItems = holdings.map((h) => ({ symbol: h.symbol, asset_type: h.asset_type }))
  const { prices, loading } = usePrices(priceItems)

  const totalAssets = holdings.reduce((sum, h) => {
    const price = prices[h.symbol.toUpperCase()]
    const value = price != null
      ? Number(h.quantity) * price
      : Number(h.quantity) * Number(h.average_cost_basis)
    return sum + value
  }, 0)

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.current_balance), 0)
  const netWorth = totalAssets - totalDebt

  const usingLivePrices = Object.keys(prices).length > 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Assets"
        value={<MaskedAmount amount={totalAssets} currency={currency} />}
        change={
          loading ? (
            <span style={{ color: 'var(--color-muted-foreground)' }}>loading…</span>
          ) : usingLivePrices ? (
            <span style={{ color: 'var(--color-muted-foreground)' }}>live</span>
          ) : undefined
        }
        icon={<TrendingUp size={16} />}
      />
      <StatCard
        label="Total Debt"
        value={<MaskedAmount amount={totalDebt} currency={currency} />}
        icon={<TrendingDown size={16} />}
      />
      <StatCard
        label="Net Worth"
        value={
          <span style={{ color: netWorth >= 0 ? 'var(--color-accent)' : '#ef4444' }}>
            <MaskedAmount amount={netWorth} currency={currency} />
          </span>
        }
        icon={<Wallet size={16} />}
      />
      <StatCard
        label="Portfolios"
        value={portfolioCount}
        change={
          <span style={{ color: 'var(--color-muted-foreground)' }}>
            {holdings.length} holdings
          </span>
        }
        icon={<PiggyBank size={16} />}
      />
    </div>
  )
}
