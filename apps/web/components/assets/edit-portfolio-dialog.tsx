'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Portfolio } from '@networth/types'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'

interface Props {
  portfolio: Portfolio
  onClose: () => void
}

export function EditPortfolioDialog({ portfolio, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(portfolio.name)
  const [description, setDescription] = useState(portfolio.description ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('portfolios').update({
      name,
      description: description || null,
    }).eq('id', portfolio.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <Dialog title="Edit Portfolio" onClose={onClose}>
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
        <DialogFooter onClose={onClose} loading={loading} />
      </form>
    </Dialog>
  )
}
