export function safePercentChange(change: number | null, base: number | null): number | null {
  if (change === null || base === null || base === 0) return null
  const pct = (change / base) * 100
  return Number.isFinite(pct) ? pct : null
}
