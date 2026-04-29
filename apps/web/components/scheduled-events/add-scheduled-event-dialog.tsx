'use client'

import { useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { CurrencyCode, IncomeFrequency, TransactionType } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

const FREQUENCIES: IncomeFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annually']
const EVENT_TYPES: TransactionType[] = ['dividend', 'deposit', 'withdrawal']

interface Props {
  userId: string
  assetId?: string
  defaultCurrency: CurrencyCode
  onClose: () => void
}

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

  useModalClose(onClose)

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
    <div className="rmodal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">New schedule</div>
            <h2>Add a <em>scheduled event</em></h2>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Event name</label>
              <input
                className="minput"
                placeholder="e.g. Quarterly dividend"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mfield-row">
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Type</label>
                <div className="toggle-row">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={txType === t ? 'on' : ''}
                      onClick={() => setTxType(t)}
                    >
                      {TRANSACTION_TYPE_LABELS[t] ?? t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Amount type</label>
                <div className="toggle-row">
                  <button type="button" className={amountType === 'fixed' ? 'on' : ''} onClick={() => setAmountType('fixed')}>Fixed</button>
                  <button type="button" className={amountType === 'percent' ? 'on' : ''} onClick={() => setAmountType('percent')}>Percent %</button>
                </div>
              </div>
            </div>

            <div className="mfield">
              <label className="mfield-label">Frequency</label>
              <div className="toggle-row" style={{ flexWrap: 'wrap' }}>
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={freq === f ? 'on' : ''}
                    onClick={() => setFreq(f)}
                  >
                    {INCOME_FREQUENCY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mfield-row">
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Amount</label>
                <input
                  type="number"
                  className="minput mono"
                  placeholder="500"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Currency</label>
                <CurrencyPicker
                  value={currency}
                  onChange={(c) => setCurrency(c as CurrencyCode)}
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', width: '100%' }}
                />
              </div>
            </div>

            <div className="mfield" style={{ marginBottom: 0 }}>
              <label className="mfield-label">Notes <span className="mfield-opt">Optional</span></label>
              <input
                className="minput"
                placeholder="Optional note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p style={{ fontSize: 13, color: 'var(--neg)', marginTop: 8 }}>{error}</p>}
          </div>

          <div className="rmodal-foot">
            <div className="rmodal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Saving…' : 'Add event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
