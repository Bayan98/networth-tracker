import type { ReactNode } from 'react'

function MiniStat({ label, value, sub, trend }: {
  label: string
  value: ReactNode
  sub: ReactNode
  trend?: 'pos' | 'neg'
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val" style={{ fontSize: 20, marginBottom: 4 }}>{value}</div>
      <div className="kpi-sub" style={{ color: trend === 'pos' ? 'var(--pos)' : trend === 'neg' ? 'var(--neg)' : 'var(--ink-faint)' }}>
        {sub}
      </div>
    </div>
  )
}

interface Props {
  totalValue: ReactNode
  totalGainPct: ReactNode
  totalGainTrend?: 'pos' | 'neg'
  totalCostBasis: ReactNode
  periodChange: ReactNode
  periodChangePct: ReactNode
  periodTrend?: 'pos' | 'neg'
  todayChange: ReactNode
  todayChangePct: ReactNode
  todayTrend?: 'pos' | 'neg'
}

export function PortfolioStats({
  totalValue,
  totalGainPct,
  totalGainTrend,
  totalCostBasis,
  periodChange,
  periodChangePct,
  periodTrend,
  todayChange,
  todayChangePct,
  todayTrend,
}: Props) {
  return (
    <div className="stat-grid">
      <MiniStat label="Total value" value={totalValue} sub={totalGainPct} trend={totalGainTrend} />
      <MiniStat label="Cost basis" value={totalCostBasis} sub="Invested" />
      <MiniStat label="Period change" value={periodChange} sub={periodChangePct} trend={periodTrend} />
      <MiniStat label="Today" value={todayChange} sub={todayChangePct} trend={todayTrend} />
    </div>
  )
}
