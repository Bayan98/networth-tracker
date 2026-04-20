'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Portfolio } from '@networth/types'
import { AddPortfolioDialog } from './add-portfolio-dialog'
import { EditPortfolioDialog } from './edit-portfolio-dialog'

interface Props {
  portfolios: Portfolio[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  userId: string
}

export function PortfolioClient({ portfolios, selectedId, onSelect, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Portfolio | null>(null)

  const selected = portfolios.find((p) => p.id === selectedId)

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('portfolios').delete().eq('id', id)
    if (!error) {
      if (selectedId === id) onSelect(null)
      router.refresh()
    }
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-lg text-sm font-medium hover:opacity-80 active:opacity-70 transition-opacity"
          style={{
            background: selectedId ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-card)',
            color: selectedId ? 'var(--color-accent)' : 'var(--color-foreground)',
            border: `1px solid ${selectedId ? 'var(--color-accent)' : 'var(--color-border)'}`,
          }}
        >
          <span>{selected?.name ?? 'All portfolios'}</span>
          <ChevronDown
            size={13}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-muted-foreground)' }}
          />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-xl py-1 min-w-45"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            onMouseLeave={() => setOpen(false)}
          >
            <DropdownOption
              label="All portfolios"
              active={selectedId === null}
              onClick={() => { onSelect(null); setOpen(false) }}
            />
            {portfolios.map((p) => (
              <DropdownOption
                key={p.id}
                label={p.name}
                active={selectedId === p.id}
                onClick={() => { onSelect(p.id); setOpen(false) }}
                onEdit={() => { setEditing(p); setOpen(false) }}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
            <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />
            <button
              onClick={() => { setShowAdd(true); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <Plus size={13} /> New portfolio
            </button>
          </div>
        )}
      </div>

      {showAdd && <AddPortfolioDialog userId={userId} onClose={() => setShowAdd(false)} />}
      {editing && <EditPortfolioDialog portfolio={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function DropdownOption({
  label,
  active,
  onClick,
  onEdit,
  onDelete,
}: {
  label: string
  active: boolean
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className="group/opt flex items-center transition-colors"
      style={{ background: active ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : undefined }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-muted)' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = '' }}
    >
      <button
        onClick={onClick}
        className="flex-1 px-3 py-1.5 text-sm text-left"
        style={{ color: active ? 'var(--color-accent)' : 'var(--color-foreground)' }}
      >
        {label}
      </button>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/opt:opacity-100 pr-1 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--color-muted-foreground)' }}
              title="Edit portfolio"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: '#ef4444' }}
              title="Delete portfolio"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
