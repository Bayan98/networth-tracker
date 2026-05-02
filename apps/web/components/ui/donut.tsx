'use client'

import { useState } from 'react'

export interface DonutSegment {
  color: string
  value: number
  label: string
}

export function Donut({
  segments,
  size = 160,
  thickness = 10,
  formatValue,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  formatValue?: (v: number) => string
}) {
  const [hovered, setHovered] = useState(0)
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return null

  const r = (size - thickness) / 2
  const c = size / 2
  let offset = -Math.PI / 2
  const gap = segments.length > 1 ? 0.012 : 0

  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * Math.PI * 2
    const start = offset
    const end = offset + angle
    offset = end
    const sx1 = c + Math.cos(start + gap) * r
    const sy1 = c + Math.sin(start + gap) * r
    const sx2 = c + Math.cos(end - gap) * r
    const sy2 = c + Math.sin(end - gap) * r
    const large = angle > Math.PI ? 1 : 0
    return {
      d: `M ${sx1} ${sy1} A ${r} ${r} 0 ${large} 1 ${sx2} ${sy2}`,
      color: seg.color,
      pct: (seg.value / total) * 100,
      label: seg.label,
      value: seg.value,
    }
  })

  const active = arcs[Math.min(hovered, arcs.length - 1)]

  return (
    <div
      style={{ position: 'relative', width: size, height: size }}
      onMouseLeave={() => setHovered(0)}
    >
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {arcs.map((a, i) => (
          <path
            key={i}
            d={a.d}
            fill="none"
            stroke={a.color}
            strokeWidth={hovered === i ? thickness + 3 : thickness}
            strokeLinecap="butt"
            style={{ cursor: 'pointer', transition: 'stroke-width .12s' }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 500, letterSpacing: '0.02em', maxWidth: r * 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active.label}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', marginTop: 2, color: active.color }}>
          {active.pct.toFixed(1)}%
        </div>
        {formatValue && (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em', marginTop: 1 }}>
            {formatValue(active.value)}
          </div>
        )}
      </div>
    </div>
  )
}
