import { ASSET_TYPE_LABELS } from '@networth/utils'
import type { AssetType } from '@networth/types'

interface Props {
  allTypes: AssetType[]
  selectedTypes: Set<AssetType>
  onToggle: (type: AssetType) => void
}

export function AssetTypeFilter({ allTypes, selectedTypes, onToggle }: Props) {
  if (allTypes.length <= 1) return null
  
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {allTypes.map((type) => {
        const active = selectedTypes.has(type)
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className="btn"
            style={{
              fontSize: 12,
              padding: '5px 10px',
              background: active ? 'color-mix(in oklch, var(--accent) 12%, transparent)' : 'var(--surface)',
              color: active ? 'var(--accent)' : 'var(--ink-muted)',
              border: `1px solid ${active ? 'color-mix(in oklch, var(--accent) 35%, transparent)' : 'var(--border)'}`,
            }}
          >
            {ASSET_TYPE_LABELS[type] ?? type}
          </button>
        )
      })}
    </div>
  )
}
