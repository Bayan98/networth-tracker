import { ASSET_TYPE_LABELS } from '@networth/utils'
import type { AssetType } from '@networth/types'
import { ASSET_TYPES } from '../asset-type-config/common'

const ASSET_TYPE_ORDER = new Map<AssetType, number>(
  ASSET_TYPES.map((type, index) => [type, index]),
)

interface Props {
  allTypes: AssetType[]
  selectedTypes: Set<AssetType>
  onToggle: (type: AssetType) => void
}

export function AssetTypeFilter({ allTypes, selectedTypes, onToggle }: Props) {
  if (allTypes.length <= 1) return null

  const orderedTypes = [...allTypes].sort((a, b) => {
    return (ASSET_TYPE_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER) - (ASSET_TYPE_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER)
  })
  
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {orderedTypes.map((type) => {
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
