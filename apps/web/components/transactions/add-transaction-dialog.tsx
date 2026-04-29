'use client'

import { useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTxFxRate } from '@/lib/hooks/use-tx-fx-rate'
import { TRANSACTION_TYPE_LABELS, formatCurrency } from '@networth/utils'
import type { TransactionType, CurrencyCode } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

const TX_TYPES: TransactionType[] = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'split']

interface Props {
  userId: string
  assetId?: string
  assetCurrency?: CurrencyCode
  onClose: () => void
}

export function AddTransactionDialog({ userId, assetId, assetCurrency, onClose }: Props) {
  const router = useRouter()
  const [txType, setTxType] = useState<TransactionType>('buy')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(assetCurrency ?? 'USD')
  const [executedAt, setExecutedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsFx = !!assetId && !!assetCurrency && currency.toUpperCase() !== assetCurrency.toUpperCase()
  const { rate: fxRate, loading: fxLoading } = useTxFxRate(currency, assetCurrency, executedAt.slice(0, 10))

  useModalClose(onClose)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      asset_id: assetId ?? null,
      transaction_type: txType,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      currency,
      executed_at: new Date(executedAt).toISOString(),
      notes: notes || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  const priceNum = parseFloat(price)
  const convertedPrice = needsFx && !isNaN(priceNum) ? priceNum * fxRate : null

  return (
    <div className="rmodal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">New transaction</div>
            <h2>Add a <em>transaction</em></h2>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Type</label>
              <div className="toggle-row" style={{ flexWrap: 'wrap' }}>
                {TX_TYPES.map((t) => (
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

            <div className="mfield-row">
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Quantity</label>
                <input
                  type="number"
                  className="minput mono"
                  placeholder="10"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Price / unit</label>
                <input
                  type="number"
                  className="minput mono"
                  placeholder="150.00"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                {convertedPrice != null && (
                  <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                    {fxLoading ? 'Fetching rate…' : `≈ ${formatCurrency(convertedPrice, assetCurrency!)} in ${assetCurrency}`}
                  </p>
                )}
              </div>
            </div>

            <div className="mfield-row">
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Currency</label>
                <CurrencyPicker
                  value={currency}
                  onChange={(c) => setCurrency(c as CurrencyCode)}
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', width: '100%' }}
                />
              </div>
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Date &amp; time</label>
                <input
                  type="datetime-local"
                  className="minput"
                  value={executedAt}
                  onChange={(e) => setExecutedAt(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mfield" style={{ marginBottom: 0 }}>
              <label className="mfield-label">Notes <span className="mfield-opt">Optional</span></label>
              <input
                className="minput"
                placeholder="e.g. Quarterly rebalance"
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
                {loading ? 'Adding…' : 'Add transaction'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
