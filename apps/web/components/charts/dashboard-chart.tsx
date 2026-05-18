'use client'

import type { CurrencyCode } from '@networth/types'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import {
  getChartSeriesMin,
  PERIOD_HEADER_LABELS,
  splitMarketValueSeries,
  type Period,
} from '@/components/charts/chart-utils'
import { CommonChartCard, renderCommonMarketValueAreas } from '@/components/charts/common-chart-card'
import { MoneyTextWithDimFraction } from '@/components/ui/money-text'
import type { SeriesPoint } from '@/lib/hooks/use-portfolio-history'

interface Props {
  series: SeriesPoint[]
  currency: CurrencyCode
  loading: boolean
  period: Period
  onPeriodChange: (period: Period) => void
  netWorth?: number | null
  totalDebts?: number | null
  currentTotalsLoading?: boolean
  periodIncome?: number | null
  height?: number
}

export function DashboardChart({
  series,
  currency,
  loading,
  period,
  onPeriodChange,
  netWorth,
  totalDebts,
  currentTotalsLoading = false,
  periodIncome,
  height = 320,
}: Props) {
  const { displayPrice } = useAmountDisplay()
  const chartData = splitMarketValueSeries(series)
  const seriesMin = getChartSeriesMin(series, (point) => [point.costBasis, point.marketValue])
  const header = (
    <div className="chart-header-stats">
      <div className="chart-header-stat">
        <div className="empty-label">Net worth · {currency}</div>
        <div className="chart-header-big">
          <MoneyTextWithDimFraction
            value={netWorth ?? null}
            currency={currency}
            loading={currentTotalsLoading}
            skelWidth={220}
            skelHeight={40}
          />
        </div>
      </div>
      <div className="chart-header-stat">
        <div className="empty-label">Total debts · {currency}</div>
        <div className="chart-header-big" style={{ color: 'var(--neg)' }}>
          <MoneyTextWithDimFraction
            value={totalDebts ?? null}
            currency={currency}
            loading={currentTotalsLoading}
            skelWidth={220}
            skelHeight={40}
          />
        </div>
      </div>
      {periodIncome !== undefined && (
        <div className="chart-header-stat">
          <div className="empty-label">
            Total income · {currency} · {PERIOD_HEADER_LABELS[period]}
          </div>
          <div
            className="chart-header-big"
            style={{
              color:
                periodIncome !== null && periodIncome > 0
                  ? 'var(--pos)'
                  : periodIncome !== null && periodIncome < 0
                    ? 'var(--neg)'
                    : undefined,
            }}
          >
            <MoneyTextWithDimFraction
              value={periodIncome ?? null}
              currency={currency}
              loading={loading || periodIncome === null}
              withSign
              skelWidth={220}
              skelHeight={40}
            />
          </div>
        </div>
      )}
    </div>
  )
  const emptyContent = (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink-faint)',
        fontSize: 13,
      }}
    >
      Add transactions to see performance.
    </div>
  )

  return (
    <CommonChartCard
      header={header}
      data={chartData}
      currency={currency}
      loading={loading}
      period={period}
      onPeriodChange={onPeriodChange}
      seriesMin={seriesMin}
      height={height}
      emptyContent={emptyContent}
      tooltipFormatter={(value: number, name: string) => [
        displayPrice(value, currency),
        name === 'costBasis' ? 'Invested' : 'Market Value',
      ]}
    >
      {renderCommonMarketValueAreas({ idPrefix: 'dashboard', seriesMin })}
    </CommonChartCard>
  )
}
