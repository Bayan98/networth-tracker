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
import { CHART_TOOLTIP_STYLE, formatChartDate, type Period } from '@/components/ui/area-chart'
import type { SeriesPoint } from '@/lib/hooks/use-portfolio-history'

interface Props {
  series: SeriesPoint[]
  currency: CurrencyCode
  loading: boolean
  period: Period
  onPeriodChange: (p: Period) => void
}

const PERIODS: Period[] = ['1w', '1m', '1y', '5y']
const PERIOD_LABELS: Record<Period, string> = { '1w': '1W', '1m': '1M', '1y': '1Y', '5y': '5Y' }

const GREEN = '#22c55e'
const RED   = '#ef4444'

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

export function HoldingsChart({ series, currency, loading, period, onPeriodChange }: Props) {
  const isEmpty = !loading && series.length === 0
  const chartData = splitMarketSeries(series)
  const seriesMin = series.length > 0
    ? Math.min(...series.flatMap((p) => [p.costBasis, p.marketValue])) * 0.99
    : 0

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Portfolio Performance</h2>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-opacity hover:opacity-80 active:opacity-60"
              style={{
                background: period === p ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
                color: period === p ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
                border: `1px solid ${period === p ? 'color-mix(in srgb, var(--color-accent) 35%, transparent)' : 'transparent'}`,
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: '180px' }}>
        {loading ? (
          <div className="w-full rounded-lg animate-pulse" style={{ height: '180px', background: 'var(--color-muted)' }} />
        ) : isEmpty ? (
          <div className="w-full flex items-center justify-center" style={{ height: '180px', color: 'var(--color-muted-foreground)' }}>
            <p className="text-sm">Add transactions to see performance.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cbFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-muted-foreground)" stopOpacity={0.10} />
                  <stop offset="95%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
                </linearGradient>

                <linearGradient id="mvFillGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="mvFillRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RED} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={RED} stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />

              <XAxis
                type="number"
                dataKey="timestamp"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(v: number) => formatChartDate(new Date(v).toISOString().slice(0, 10), period)}
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompact(v, currency)}
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={58}
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
                stroke="var(--color-muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={0.55}
                fill="url(#cbFill)"
                baseValue={seriesMin}
                dot={false}
              />

              <Area
                type="monotone"
                dataKey="mvAbove"
                connectNulls={false}
                stroke={GREEN}
                strokeWidth={2}
                fill="url(#mvFillGreen)"
                baseValue={seriesMin}
                dot={false}
              />

              <Area
                type="monotone"
                dataKey="mvBelow"
                connectNulls={false}
                stroke={RED}
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
