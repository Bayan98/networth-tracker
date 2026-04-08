export type Period = '1w' | '1m' | '1y' | '5y'

export const CHART_TOOLTIP_STYLE = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: 12,
}

export function formatChartDate(dateStr: string, period: Period): string {
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00Z' : dateStr)
  if (period === '1w' || period === '1m') {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
}
