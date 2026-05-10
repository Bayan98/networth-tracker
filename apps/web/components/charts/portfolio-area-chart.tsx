'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatCurrency, formatCompact } from '@networth/utils'
import type { CurrencyCode } from '@networth/types'
import { CHART_TOOLTIP_STYLE, formatChartDate, type Period } from '@/components/charts/chart-utils'
import type { SeriesPoint } from '@/lib/hooks/use-portfolio-history'

interface Props {
  series: SeriesPoint[]
  currency: CurrencyCode
  loading: boolean
  period: Period
  onPeriodChange: (p: Period) => void
  totalValue?: number | null
  hideAmounts?: boolean
  height?: number
}

const PERIODS: Period[] = ['1w', '1m', '1y', '5y']
const PERIOD_LABELS: Record<Period, string> = { '1w': '1W', '1m': '1M', '1y': '1Y', '5y': '5Y' }
const PERIOD_HEADER_LABELS: Record<Period, string> = { '1w': 'Past 1W', '1m': 'Past 1M', '1y': 'Past 1Y', '5y': 'Past 5Y' }

type ChartPoint = SeriesPoint & {
  timestamp: number
  mvAbove: number | null
  mvBelow: number | null
  isCrossPoint?: boolean
}

function toMs(date: string): number {
  return new Date(date + 'T12:00:00Z').getTime()
}

function toColoredPoint(p: SeriesPoint): ChartPoint {
  const isAboveOrEqual = p.marketValue >= p.costBasis
  return {
    ...p,
    timestamp: toMs(p.date),
    mvAbove: isAboveOrEqual ? p.marketValue : null,
    mvBelow: isAboveOrEqual ? null : p.marketValue,
  }
}

function splitMarketSeries(series: SeriesPoint[]): ChartPoint[] {
  if (series.length <= 1) return series.map(toColoredPoint)

  const out: ChartPoint[] = []
  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i]
    const b = series[i + 1]
    out.push(toColoredPoint(a))

    const d1 = a.marketValue - a.costBasis
    const d2 = b.marketValue - b.costBasis
    const crosses = d1 * d2 < 0
    if (!crosses) continue

    const denom = (b.marketValue - a.marketValue) - (b.costBasis - a.costBasis)
    if (denom === 0) continue
    const t = (a.costBasis - a.marketValue) / denom
    if (t <= 0 || t >= 1) continue

    const aMs = toMs(a.date)
    const bMs = toMs(b.date)
    const crossMarket = a.marketValue + (b.marketValue - a.marketValue) * t
    const crossCost = a.costBasis + (b.costBasis - a.costBasis) * t
    out.push({
      date: new Date(aMs + (bMs - aMs) * t).toISOString().slice(0, 10),
      timestamp: aMs + (bMs - aMs) * t,
      marketValue: crossMarket,
      costBasis: crossCost,
      mvAbove: crossMarket,
      mvBelow: crossMarket,
      isCrossPoint: true,
    })
  }

  out.push(toColoredPoint(series[series.length - 1]))
  return out
}

export function PortfolioAreaChart({ series, currency, loading, period, onPeriodChange, totalValue, hideAmounts, height = 320 }: Props) {
  const isEmpty = !loading && series.length === 0
  const chartData = splitMarketSeries(series)
  const seriesMin = series.length > 0
    ? Math.min(...series.flatMap((p) => [p.costBasis, p.marketValue])) * 0.99
    : 0

  const showNetworth = totalValue !== undefined

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: 'var(--density-pad-y) var(--density-pad-x) 20px',
        display: 'flex',
        alignItems: showNetworth ? 'flex-end' : 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          {showNetworth ? (
            <>
              <div className="empty-label">
                Net worth · {currency} · {PERIOD_HEADER_LABELS[period]}
              </div>
              <div style={{
                marginTop: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: 'var(--ink)',
              }}>
                {hideAmounts
                  ? '•••••'
                  : loading
                  ? '—'
                  : totalValue !== null
                  ? formatCurrency(totalValue, currency)
                  : '—'}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }}>
              Portfolio Performance
            </div>
          )}
        </div>

        <div className="segmented" style={{ flexShrink: 0 }}>
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={period === p ? 'active' : ''}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height, paddingBottom: 20 }}>
        {loading ? (
          <div style={{
            height: '100%',
            margin: '0 var(--density-pad-x)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius)',
            opacity: 0.6,
          }} />
        ) : isEmpty ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-faint)',
            fontSize: 13,
          }}>
            Add transactions to see performance.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cbFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--ink-faint)" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="var(--ink-faint)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mvFillGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pos)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--pos)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="mvFillRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neg)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--neg)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
                strokeOpacity={0.7}
              />
              <XAxis
                type="number"
                dataKey="timestamp"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(v: number) => formatChartDate(new Date(v).toISOString().slice(0, 10), period)}
                tick={{ fontSize: 10, fill: 'var(--ink-faint)', fontFamily: 'var(--font-jetbrains-mono, JetBrains Mono, monospace)' }}
                axisLine={false}
                tickLine={false}
                minTickGap={52}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompact(v, currency)}
                tick={{ fontSize: 10, fill: 'var(--ink-faint)', fontFamily: 'var(--font-jetbrains-mono, JetBrains Mono, monospace)' }}
                axisLine={false}
                tickLine={false}
                width={60}
                domain={[seriesMin, 'auto']}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={(v: number) => formatChartDate(new Date(v).toISOString().slice(0, 10), period)}
                formatter={(value: number, name: string) => [
                  formatCurrency(value, currency),
                  name === 'costBasis' ? 'Invested' : 'Market Value',
                ]}
              />
              <Area
                type="monotone"
                dataKey="costBasis"
                stroke="var(--border-strong)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={0.7}
                fill="url(#cbFill)"
                baseValue={seriesMin}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="mvAbove"
                connectNulls={false}
                stroke="var(--pos)"
                strokeWidth={2}
                fill="url(#mvFillGreen)"
                baseValue={seriesMin}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="mvBelow"
                connectNulls={false}
                stroke="var(--neg)"
                strokeWidth={2}
                fill="url(#mvFillRed)"
                baseValue={seriesMin}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export { PortfolioAreaChart as AssetsChart }
