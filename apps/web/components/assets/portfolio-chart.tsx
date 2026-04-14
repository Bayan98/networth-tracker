'use client'

import { useState } from 'react'
import { usePortfolioHistory } from '@/lib/hooks/use-portfolio-history'
import { useAppStore } from '@/lib/store'
import { AssetsChart } from './assets-chart'
import type { Asset, CurrencyCode } from '@networth/types'
import type { Period } from '@/components/ui/area-chart'

interface Props {
  assets: Asset[]
  currency: CurrencyCode
}

export function PortfolioChart({ assets, currency }: Props) {
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const [period, setPeriod] = useState<Period>('1y')
  const displayCurrency = selectedCurrency || currency
  const { series, loading } = usePortfolioHistory(assets, period, displayCurrency)

  return (
    <AssetsChart
      series={series}
      currency={displayCurrency}
      loading={loading}
      period={period}
      onPeriodChange={setPeriod}
    />
  )
}
