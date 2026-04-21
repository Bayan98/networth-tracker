'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Debt, CurrencyCode } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'

interface Props {
  debt: Debt
  onClose: () => void
}

export function EditDebtDialog({ debt, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(debt.name)
  const [principal, setPrincipal] = useState(String(debt.principal_amount))
  const [balance, setBalance] = useState(String(debt.current_balance))
  const [rate, setRate] = useState(String(Number(debt.interest_rate) * 100))
  const [minPayment, setMinPayment] = useState(String(debt.minimum_payment))
  const [currency, setCurrency] = useState<CurrencyCode>(debt.currency)
  const [notes, setNotes] = useState(debt.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('debts').update({
      name,
      principal_amount: parseFloat(principal),
      current_balance: parseFloat(balance),
      interest_rate: parseFloat(rate) / 100,
      minimum_payment: parseFloat(minPayment) || 0,
      currency,
      notes: notes || null,
    }).eq('id', debt.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <Dialog title="Edit Debt" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="dlg-label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home Mortgage" required className="dlg-field" style={inputStyle} />
        </div>
        <div className="dlg-grid">
          <div>
            <label className="dlg-label">Original amount</label>
            <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} min="0" step="any" required className="dlg-field" style={inputStyle} />
          </div>
          <div>
            <label className="dlg-label">Current balance</label>
            <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} min="0" step="any" required className="dlg-field" style={inputStyle} />
          </div>
          <div>
            <label className="dlg-label">Interest rate (%)</label>
            <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} min="0" step="any" required className="dlg-field" style={inputStyle} />
          </div>
          <div>
            <label className="dlg-label">Min. payment</label>
            <input type="number" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} min="0" step="any" className="dlg-field" style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="dlg-label">Currency</label>
          <CurrencyPicker value={currency} onChange={(c) => setCurrency(c as CurrencyCode)} style={inputStyle} />
        </div>
        <div>
          <label className="dlg-label">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="dlg-field" style={inputStyle} />
        </div>
        {error && <p style={{ fontSize: 13, color: 'var(--neg)' }}>{error}</p>}
        <DialogFooter onClose={onClose} loading={loading} />
      </form>
    </Dialog>
  )
}
