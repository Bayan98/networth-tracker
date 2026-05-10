import { PortfolioAreaChart } from '@/components/charts/portfolio-area-chart'
import type { CurrencyCode } from '@networth/types'
import type { Period } from '@/components/charts/chart-utils'
import type { SeriesPoint } from '@/lib/hooks/use-portfolio-history'

interface Props {
  series: SeriesPoint[]
  currency: CurrencyCode
  loading: boolean
  period: Period
  onPeriodChange: (period: Period) => void
}

export function PortfolioPerformance({ series, currency, loading, period, onPeriodChange }: Props) {
  return (
    <PortfolioAreaChart
      series={series}
      currency={currency}
      loading={loading}
      period={period}
      onPeriodChange={onPeriodChange}
    />
  )
}
