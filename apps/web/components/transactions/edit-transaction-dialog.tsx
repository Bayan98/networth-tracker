'use client'

import { useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTxFxRate } from '@/lib/hooks/use-tx-fx-rate'
import { TRANSACTION_TYPE_LABELS, formatCurrency } from '@networth/utils'
import type { Transaction, TransactionType, CurrencyCode, AssetType } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { getAssetTypeConfig, isGramPricedMetal, withCurrentType } from '@/components/assets/asset-type-config'

interface Props {
  transaction: Transaction
  assetCurrency?: string
  assetSymbol?: string | null
  assetType?: AssetType
  onClose: () => void
}

export function EditTransactionDialog({ transaction, assetCurrency, assetSymbol, assetType, onClose }: Props) {
  const router = useRouter()
  const assetConfig = getAssetTypeConfig(assetType)
  const [txType, setTxType] = useState<TransactionType>(transaction.transaction_type)
  const [quantity, setQuantity] = useState(String(transaction.quantity))
  const [price, setPrice] = useState(String(transaction.price))
  const [currency, setCurrency] = useState<CurrencyCode>(transaction.currency)
  const [executedAt, setExecutedAt] = useState(new Date(transaction.executed_at).toISOString().slice(0, 10))
  const [notes, setNotes] = useState(transaction.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsFx = !!assetCurrency && currency.toUpperCase() !== assetCurrency.toUpperCase()
  const { rate: fxRate, loading: fxLoading } = useTxFxRate(currency, assetCurrency, executedAt.slice(0, 10))

  useModalClose(onClose)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('transactions').update({
      transaction_type: txType,
      quantity: assetConfig.transactions.showQuantity ? parseFloat(quantity) : 1,
      price: parseFloat(price),
      currency,
      executed_at: new Date(executedAt + 'T12:00:00.000Z').toISOString(),
      notes: notes || null,
    }).eq('id', transaction.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  const priceNum = parseFloat(price)
  const convertedPrice = needsFx && !isNaN(priceNum) ? priceNum * fxRate : null
  const availableTypes = withCurrentType(assetConfig.transactions.allowedTypes, txType)
  const txLabels = assetConfig.transactions.labels
  const isGramMetal = assetType === 'commodity' && isGramPricedMetal(assetSymbol)
  const quantityLabel = isGramMetal ? 'Quantity (g)' : assetConfig.transactions.quantityLabel
  const priceLabel = isGramMetal ? 'Price / g' : assetConfig.transactions.priceLabel

  return (
    <div className="rmodal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">Edit transaction</div>
            <h2>Edit <em>transaction</em></h2>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Type</label>
              <div className="toggle-row" style={{ flexWrap: 'wrap' }}>
                {availableTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={txType === t ? 'on' : ''}
                    onClick={() => setTxType(t)}
                  >
                    {txLabels[t] ?? TRANSACTION_TYPE_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mfield-row">
              {assetConfig.transactions.showQuantity && (
                <div className="mfield" style={{ margin: 0 }}>
                  <label className="mfield-label">{quantityLabel}</label>
                  <input
                    type="number"
                    className="minput mono"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">{priceLabel}</label>
                <input
                  type="number"
                  className="minput mono"
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
                <label className="mfield-label">Date</label>
                <input
                  type="date"
                  className="minput"
                  value={executedAt}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setExecutedAt(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mfield" style={{ marginBottom: 0 }}>
              <label className="mfield-label">Notes <span className="mfield-opt">Optional</span></label>
              <input
                className="minput"
                placeholder={assetConfig.transactions.notePlaceholder}
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
