type CorporateActionKind = 'dividend' | 'split'
type LegacyMarkerKind = 'div' | 'split'

const LEGACY_MARKER_RE = /\[auto:yahoo:(div|split):(\d+)\]/g

export interface CorporateActionMetadata {
  source: 'yahoo'
  type: CorporateActionKind
  id: string
  timestamp: number
}

export function buildCorporateActionMetadata(kind: CorporateActionKind, timestamp: number): {
  corporate_action: CorporateActionMetadata
} {
  const markerKind = kind === 'dividend' ? 'div' : 'split'
  return {
    corporate_action: {
      source: 'yahoo',
      type: kind,
      id: `${markerKind}:${timestamp}`,
      timestamp,
    },
  }
}

export function getCorporateActionId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const action = (metadata as { corporate_action?: unknown }).corporate_action
  if (!action || typeof action !== 'object') return null
  const { source, id } = action as { source?: unknown; id?: unknown }
  return source === 'yahoo' && typeof id === 'string' ? id : null
}

export function isAutoCorporateAction(metadata: unknown, notes?: string | null): boolean {
  LEGACY_MARKER_RE.lastIndex = 0
  return getCorporateActionId(metadata) !== null || LEGACY_MARKER_RE.test(notes ?? '')
}

export function getLegacyCorporateActionIds(notes?: string | null): string[] {
  const ids: string[] = []
  if (!notes) return ids
  LEGACY_MARKER_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LEGACY_MARKER_RE.exec(notes)) !== null) {
    ids.push(`${match[1] as LegacyMarkerKind}:${match[2]}`)
  }
  return ids
}

export function stripLegacyCorporateActionMarkers(notes?: string | null): string {
  return (notes ?? '').replace(/\s*\[auto:yahoo:(?:div|split):\d+\]\s*/g, ' ').trim()
}
