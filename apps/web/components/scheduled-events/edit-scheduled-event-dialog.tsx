'use client'

import { useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import type { AssetType, ScheduledEvent, CurrencyCode, IncomeFrequency, TransactionType } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { getAssetTypeConfig, withCurrentType } from '@/components/assets/asset-type-config'

const FREQUENCIES: IncomeFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annually']

interface Props {
  event: ScheduledEvent
  assetType?: AssetType
  onClose: () => void
}

export function EditScheduledEventDialog({ event, assetType, onClose }: Props) {
  const router = useRouter()
  const assetConfig = getAssetTypeConfig(assetType)
  const [name, setName] = useState(event.name)
  const [txType, setTxType] = useState<TransactionType>(event.transaction_type)
  const [amountType, setAmountType] = useState<'fixed' | 'percent'>(event.amount_type)
  const [amount, setAmount] = useState(String(event.amount))
  const [freq, setFreq] = useState<IncomeFrequency>(event.frequency)
  const [currency, setCurrency] = useState<CurrencyCode>(event.currency)
  const [notes, setNotes] = useState(event.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useModalClose(onClose)

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

  const availableTypes = withCurrentType(assetConfig.scheduledEvents.allowedTypes, txType)

  return (
    <div className="rmodal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">Edit schedule</div>
            <h2>Edit <em>scheduled event</em></h2>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Event name</label>
              <input
                className="minput"
                placeholder={assetConfig.scheduledEvents.eventNamePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mfield-row">
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Type</label>
                <div className="toggle-row">
                  {availableTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={txType === t ? 'on' : ''}
                      onClick={() => setTxType(t)}
                    >
                      {assetConfig.scheduledEvents.labels[t] ?? TRANSACTION_TYPE_LABELS[t] ?? t}
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
                <label className="mfield-label">{assetConfig.scheduledEvents.amountLabel}</label>
                <input
                  type="number"
                  className="minput mono"
                  placeholder={assetConfig.scheduledEvents.amountPlaceholder}
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
                placeholder={assetConfig.scheduledEvents.notePlaceholder}
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
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
