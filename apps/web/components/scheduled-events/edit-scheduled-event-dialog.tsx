'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { ScheduledEvent, CurrencyCode, IncomeFrequency, TransactionType } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'

interface Props {
  event: ScheduledEvent
  onClose: () => void
}

const FREQUENCIES: IncomeFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annually']
const EVENT_TYPES: TransactionType[] = ['dividend', 'deposit', 'withdrawal']

export function EditScheduledEventDialog({ event, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(event.name)
  const [txType, setTxType] = useState<TransactionType>(event.transaction_type)
  const [amountType, setAmountType] = useState<'fixed' | 'percent'>(event.amount_type)
  const [amount, setAmount] = useState(String(event.amount))
  const [freq, setFreq] = useState<IncomeFrequency>(event.frequency)
  const [currency, setCurrency] = useState<CurrencyCode>(event.currency)
  const [notes, setNotes] = useState(event.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').update({
      name,
      transaction_type: txType,
      amount: parseFloat(amount),
      amount_type: amountType,
      currency,
      frequency: freq,
      notes: notes || null,
    }).eq('id', event.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <Dialog title="Edit Scheduled Event" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="dlg-label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Quarterly dividend…" required className="dlg-field" style={inputStyle} />
        </div>
        <div className="dlg-grid">
          <div>
            <label className="dlg-label">Type</label>
            <select value={txType} onChange={(e) => setTxType(e.target.value as TransactionType)} className="dlg-field" style={inputStyle}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t] ?? t}</option>)}
            </select>
          </div>
          <div>
            <label className="dlg-label">Frequency</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value as IncomeFrequency)} className="dlg-field" style={inputStyle}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{INCOME_FREQUENCY_LABELS[f]}</option>)}
            </select>
          </div>
          <div>
            <label className="dlg-label">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" min="0" step="any" required className="dlg-field" style={inputStyle} />
          </div>
          <div>
            <label className="dlg-label">Amount type</label>
            <select value={amountType} onChange={(e) => setAmountType(e.target.value as 'fixed' | 'percent')} className="dlg-field" style={inputStyle}>
              <option value="fixed">Fixed</option>
              <option value="percent">Percent (%)</option>
            </select>
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
