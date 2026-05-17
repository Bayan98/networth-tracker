import { ASSET_TYPE_LABELS } from '@networth/utils'
import type { AssetType } from '@networth/types'
import { ASSET_TYPES } from '../asset-type-config/common'
import { TONE_COLORS } from '@/components/ui/tone-badge'

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

  const accent = TONE_COLORS.info

  return (
    <div role="group" aria-label="Asset types" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {orderedTypes.map((type) => {
        const active = selectedTypes.has(type)
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(type)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 26,
              padding: '0 10px',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition:
                'background var(--dur-fast) var(--ease-out), ' +
                'color var(--dur-fast) var(--ease-out), ' +
                'border-color var(--dur-fast) var(--ease-out)',
              background: active
                ? `color-mix(in srgb, ${accent} 14%, transparent)`
                : 'var(--surface)',
              color: active ? accent : 'var(--ink-muted)',
              border: `1px solid ${active ? `color-mix(in srgb, ${accent} 30%, transparent)` : 'var(--ink-3)'}`,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: active ? accent : 'transparent',
                border: active ? 'none' : '1px solid var(--border-strong)',
                transition: 'background var(--dur-fast) var(--ease-out)',
              }}
            />
            {ASSET_TYPE_LABELS[type] ?? type}
          </button>
        )
      })}
    </div>
  )
}
