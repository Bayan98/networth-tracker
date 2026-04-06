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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home Mortgage" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Original amount</label>
            <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current balance</label>
            <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Interest rate (%)</label>
            <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Min. payment</label>
            <input type="number" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} min="0" step="any" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Currency</label>
          <CurrencyPicker value={currency} onChange={(c) => setCurrency(c as CurrencyCode)} style={inputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <DialogFooter onClose={onClose} loading={loading} />
      </form>
    </Dialog>
  )
}
