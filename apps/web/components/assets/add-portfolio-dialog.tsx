'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'

interface Props {
  userId: string
  onClose: () => void
}

export function AddPortfolioDialog({ userId, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('portfolios').insert({
      user_id: userId,
      name,
      description: description || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <Dialog title="New Portfolio" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="dlg-label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Portfolio" required className="dlg-field" style={inputStyle} />
        </div>
        <div>
          <label className="dlg-label">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="dlg-field" style={inputStyle} />
        </div>
        {error && <p style={{ fontSize: 13, color: 'var(--neg)' }}>{error}</p>}
        <DialogFooter onClose={onClose} loading={loading} saveLabel="Create" />
      </form>
    </Dialog>
  )
}
