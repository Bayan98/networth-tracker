'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { CurrencyCode, IncomeFrequency, TransactionType } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'

interface Props {
  userId: string
  assetId?: string
  defaultCurrency: CurrencyCode
  onClose: () => void
}

const FREQUENCIES: IncomeFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annually']
const EVENT_TYPES: TransactionType[] = ['dividend', 'deposit', 'withdrawal']

export function AddScheduledEventDialog({ userId, assetId, defaultCurrency, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [txType, setTxType] = useState<TransactionType>('dividend')
  const [amountType, setAmountType] = useState<'fixed' | 'percent'>('fixed')
  const [amount, setAmount] = useState('')
  const [freq, setFreq] = useState<IncomeFrequency>('monthly')
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').insert({
      user_id: userId,
      asset_id: assetId ?? null,
      name,
      transaction_type: txType,
      amount: parseFloat(amount),
      amount_type: amountType,
      currency,
      frequency: freq,
      notes: notes || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <Dialog title="Add Scheduled Event" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Quarterly dividend…" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <select value={txType} onChange={(e) => setTxType(e.target.value as TransactionType)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t] ?? t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Frequency</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value as IncomeFrequency)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{INCOME_FREQUENCY_LABELS[f]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount type</label>
            <select value={amountType} onChange={(e) => setAmountType(e.target.value as 'fixed' | 'percent')} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
              <option value="fixed">Fixed</option>
              <option value="percent">Percent (%)</option>
            </select>
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
