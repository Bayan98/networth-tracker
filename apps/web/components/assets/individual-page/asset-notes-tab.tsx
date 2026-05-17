interface Props {
  notes: string
  notesSaving: boolean
  notesError: string | null
  onChange: (notes: string) => void
  onSave: () => void
}

export function AssetNotesTab({ notes, notesSaving, notesError, onChange, onSave }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea
        value={notes}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Write your notes, thesis, reminders…"
        style={{
          width: '100%', minHeight: 220, padding: '16px 18px',
          background: 'var(--bg-sunken)', border: '1px solid var(--ink-3)',
          borderRadius: 'var(--radius)', resize: 'vertical',
          fontSize: 14, lineHeight: 1.7, color: 'var(--ink)',
          fontFamily: 'var(--font-sans)', outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={(event) => { event.currentTarget.style.borderColor = 'var(--accent)' }}
        onBlur={(event) => { event.currentTarget.style.borderColor = 'var(--ink-3)' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        {notesError && <p style={{ fontSize: 12, color: 'var(--neg)' }}>{notesError}</p>}
        <button
          className="btn btn-secondary"
          onClick={onSave}
          disabled={notesSaving}
          style={{ opacity: notesSaving ? 0.6 : 1 }}
        >
          {notesSaving ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}
