'use client'

import { X } from 'lucide-react'

interface DialogProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Dialog({ title, onClose, children }: DialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-sm rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface DialogFooterProps {
  onClose: () => void
  loading: boolean
  saveLabel?: string
}

export function DialogFooter({ onClose, loading, saveLabel = 'Save' }: DialogFooterProps) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2 rounded-lg text-sm font-medium"
        style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--color-accent)', color: '#fff' }}
      >
        {loading ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

export const inputStyle = {
  background: 'var(--color-muted)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-foreground)',
} as const
