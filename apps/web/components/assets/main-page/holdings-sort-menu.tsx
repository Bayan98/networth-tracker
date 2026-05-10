import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

export type SortKey = 'value-desc' | 'value-asc' | 'alpha' | 'abs-gain' | 'abs-loss' | 'rel-gain' | 'rel-loss'

export const SORT_LABELS: Record<SortKey, string> = {
  'value-desc': 'Value ↓',
  'value-asc':  'Value ↑',
  'alpha':      'A → Z',
  'abs-gain':   'Abs. gainers',
  'abs-loss':   'Abs. losers',
  'rel-gain':   'Rel. gainers %',
  'rel-loss':   'Rel. losers %',
}

interface Props {
  sortBy: SortKey
  onChange: (sortBy: SortKey) => void
}

export function HoldingsSortMenu({ sortBy, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn btn-secondary"
        style={{
          fontSize: 12,
          padding: '5px 10px',
          color: sortBy !== 'value-desc' ? 'var(--accent)' : undefined,
        }}
      >
        <SlidersHorizontal size={11} />
        Sort
        {sortBy !== 'value-desc' && (
          <span style={{ fontSize: 10, opacity: 0.65 }}>· {SORT_LABELS[sortBy]}</span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            zIndex: 50, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
            padding: '4px 0', minWidth: 160,
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false) }}
              style={{
                display: 'block', width: '100%', padding: '6px 14px',
                textAlign: 'left', fontSize: 13, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                color: sortBy === key ? 'var(--accent)' : 'var(--ink)',
                background: sortBy === key ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent',
              } as React.CSSProperties}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
