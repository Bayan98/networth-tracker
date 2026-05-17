'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  onClose: () => void
}

export function AddPortfolioDialog({ userId, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('portfolios').insert({
      user_id: userId,
      name: name.trim(),
      description: notes.trim() || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div
      className="rmodal-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">New portfolio</div>
            <h2>Create a <em>portfolio</em></h2>
            <div className="rmodal-desc">Group assets by account, strategy, or goal. You can add holdings right after.</div>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Portfolio name</label>
              <input
                ref={nameRef}
                className="minput"
                placeholder="e.g. Vanguard Brokerage"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mfield" style={{ marginBottom: 0 }}>
              <label className="mfield-label">
                Notes <span className="mfield-opt">Optional</span>
              </label>
              <textarea
                className="minput mtextarea"
                placeholder="Strategy, goals, account number, broker…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="merror">{error}</p>}
          </div>

          <div className="rmodal-foot">
            <div className="rmodal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!name.trim() || loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creating…' : 'Create portfolio'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
