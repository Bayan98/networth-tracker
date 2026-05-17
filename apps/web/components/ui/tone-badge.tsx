import type { ReactNode } from 'react'

export type RowTone = 'pos' | 'neg' | 'info' | 'neutral'

export const TONE_COLORS: Record<RowTone, string> = {
  pos: 'var(--pos)',
  neg: 'var(--neg)',
  info: 'var(--info)',
  neutral: 'var(--ink-faint)',
}

export function Badge({ tone = 'neutral', children }: { tone?: RowTone; children: ReactNode }) {
  const color = TONE_COLORS[tone]
  const bg = tone === 'neutral'
    ? 'var(--surface-2)'
    : `color-mix(in srgb, ${color} 14%, transparent)`
  const fg = tone === 'neutral' ? 'var(--ink-muted)' : color
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: '0 8px',
      borderRadius: 'var(--radius)',
      fontSize: 11,
      fontWeight: 500,
      background: bg,
      color: fg,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: fg }} />
      {children}
    </span>
  )
}

export function Swatch({ tone }: { tone: RowTone }) {
  return (
    <div style={{
      width: 3,
      alignSelf: 'stretch',
      minHeight: 32,
      borderRadius: 2,
      background: TONE_COLORS[tone],
      flexShrink: 0,
    }} />
  )
}
