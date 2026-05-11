import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { AssetType, ScheduledEvent } from '@networth/types'
import { getAssetTypeConfig } from '../asset-type-config'

interface Props {
  events: ScheduledEvent[]
  assetType?: AssetType
  onEdit: (event: ScheduledEvent) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

export function AssetScheduledTab({ events, assetType, onEdit, onDelete, onAdd }: Props) {
  const { displayPrice } = useAmountDisplay()
  const assetConfig = getAssetTypeConfig(assetType)

  function formatEventAmount(event: ScheduledEvent): string {
    if (event.amount_type === 'percent') return `${Number(event.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
    return displayPrice(Number(event.amount), event.currency)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
      {events.map((event) => (
        <div key={event.id} style={{
          padding: '16px 18px', borderRadius: 'var(--radius)',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{event.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {assetConfig.scheduledEvents.labels[event.transaction_type] ?? TRANSACTION_TYPE_LABELS[event.transaction_type] ?? event.transaction_type} · {INCOME_FREQUENCY_LABELS[event.frequency] ?? event.frequency}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                padding: '2px 7px', borderRadius: 999, fontSize: 10,
                background: event.is_active ? 'color-mix(in oklch, var(--pos) 12%, transparent)' : 'var(--bg)',
                border: '1px solid var(--border)',
                color: event.is_active ? 'var(--pos)' : 'var(--ink-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                {event.is_active ? 'active' : 'inactive'}
              </span>
              <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => onEdit(event)} title="Edit"><Pencil size={11} /></button>
              <button className="iconbtn" style={{ width: 26, height: 26, color: 'var(--neg)' }} onClick={() => onDelete(event.id)} title="Delete"><Trash2 size={11} /></button>
            </div>
          </div>
          <div className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>
            {formatEventAmount(event)}
          </div>
        </div>
      ))}
      <button
        onClick={onAdd}
        style={{
          padding: '16px 18px', borderRadius: 'var(--radius)',
          background: 'transparent', border: '1px dashed var(--border-strong)',
          color: 'var(--ink-muted)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          minHeight: 100, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}
      >
        <Plus size={14} /> Add scheduled event
      </button>
    </div>
  )
}
