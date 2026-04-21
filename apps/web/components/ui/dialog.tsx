'use client'

import { X } from 'lucide-react'

interface DialogProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

export function Dialog({ title, subtitle, onClose, children }: DialogProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      background: 'rgba(0,0,0,0.48)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 24px',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="iconbtn" style={{ width: 28, height: 28, flexShrink: 0, marginTop: -2 }}>
            <X size={15} />
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
    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
      <button
        type="button"
        onClick={onClose}
        className="btn btn-secondary"
        style={{ flex: 1, justifyContent: 'center' }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
        style={{ flex: 1, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
      >
        {loading ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

export const inputStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--ink)',
} as const
