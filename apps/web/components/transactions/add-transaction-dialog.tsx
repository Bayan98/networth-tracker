'use client'

import { useEffect, useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTxFxRate } from '@/lib/hooks/use-tx-fx-rate'
import { usePriceAtDate } from '@/lib/hooks/use-price-at-date'
import { TRANSACTION_TYPE_LABELS, formatCurrency } from '@networth/utils'
import type { TransactionType, CurrencyCode, AssetType } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { getAssetTypeConfig, getTransactionFieldConfig, isGramPricedMetal } from '@/components/assets/asset-type-config'
import { syncCorporateActions } from '@/lib/corporate-actions/sync'

const PRICE_TYPES: TransactionType[] = ['buy', 'sell']

interface Props {
  userId: string
  assetId?: string
  assetCurrency?: CurrencyCode
  assetSymbol?: string | null
  assetType?: AssetType
  onClose: () => void
}

export function AddTransactionDialog({ userId, assetId, assetCurrency, assetSymbol, assetType, onClose }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const assetConfig = getAssetTypeConfig(assetType)
  const defaultTxType = assetConfig.transactions.defaultType
  const initialTxFields = getTransactionFieldConfig(assetConfig, defaultTxType)

  const [txType, setTxType] = useState<TransactionType>(defaultTxType)
  const [quantity, setQuantity] = useState(initialTxFields.showQuantity ? '' : '1')
  const [price, setPrice] = useState('')
  const [priceManual, setPriceManual] = useState(false)
  const [currency, setCurrency] = useState<CurrencyCode>(assetCurrency ?? 'USD')
  const [executedAt, setExecutedAt] = useState(today)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsFx = !!assetId && !!assetCurrency && currency.toUpperCase() !== assetCurrency.toUpperCase()
  const { rate: fxRate, loading: fxLoading } = useTxFxRate(currency, assetCurrency, executedAt)

  const autoPriceEnabled = PRICE_TYPES.includes(txType) && !!assetSymbol && !!assetType && !priceManual
  const { price: autoPrice, loading: autoPriceLoading } = usePriceAtDate(
    assetSymbol ?? null,
    assetType ?? null,
    executedAt,
    autoPriceEnabled,
  )

  useEffect(() => {
    if (autoPriceEnabled && autoPrice != null) {
      setPrice(String(autoPrice))
    }
  }, [autoPrice, autoPriceEnabled])

  useEffect(() => {
    if (!assetConfig.transactions.allowedTypes.includes(txType)) {
      setTxType(assetConfig.transactions.defaultType)
      setPriceManual(false)
    }
  }, [assetConfig, txType])

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
      quantity: txFieldConfig.showQuantity ? parseFloat(quantity) : 1,
      price: parseFloat(price),
      currency,
      executed_at: new Date(executedAt + 'T12:00:00.000Z').toISOString(),
      notes: notes || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    if (txType === 'buy' && assetId && assetSymbol && assetType && assetCurrency) {
      void syncCorporateActions(
        supabase,
        { id: assetId, symbol: assetSymbol, currency: assetCurrency, asset_type: assetType },
        userId,
      )
    }
    router.refresh()
    onClose()
  }

  const priceNum = parseFloat(price)
  const convertedPrice = needsFx && !isNaN(priceNum) ? priceNum * fxRate : null
  const txLabels = assetConfig.transactions.labels
  const txFieldConfig = getTransactionFieldConfig(assetConfig, txType)
  const isGramMetal = assetType === 'commodity' && isGramPricedMetal(assetSymbol)
  const quantityLabel = isGramMetal ? 'Quantity (g)' : txFieldConfig.quantityLabel
  const priceLabel = isGramMetal ? 'Price / g' : txFieldConfig.priceLabel
  const pricePlaceholder = isGramMetal ? 'e.g. 96.50' : txFieldConfig.pricePlaceholder

  return (
    <div className="rmodal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">New transaction</div>
            <h2>Add a transaction</h2>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Type</label>
              <div className="toggle-row" style={{ flexWrap: 'wrap' }}>
                {assetConfig.transactions.allowedTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={txType === t ? 'on' : ''}
                    onClick={() => { setTxType(t); setPriceManual(false) }}
                  >
                    {txLabels[t] ?? TRANSACTION_TYPE_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mfield-row">
              {txFieldConfig.showQuantity && (
                <div className="mfield" style={{ margin: 0 }}>
                  <label className="mfield-label">{quantityLabel}</label>
                  <input
                    type="number"
                    className="minput mono"
                    placeholder={txFieldConfig.quantityPlaceholder}
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {priceLabel}
                  {autoPriceLoading && <Loader2 size={11} style={{ color: 'var(--ink-faint)', animation: 'spin 1s linear infinite' }} />}
                </label>
                <input
                  type="number"
                  className="minput mono"
                  placeholder={pricePlaceholder}
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value); setPriceManual(true) }}
                  required
                />
                {convertedPrice != null && (
                  <p className="mnote">
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
                />
              </div>
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">Date</label>
                <input
                  type="date"
                  className="minput"
                  value={executedAt}
                  max={today}
                  onChange={(e) => { setExecutedAt(e.target.value); setPriceManual(false) }}
                  required
                />
              </div>
            </div>

            <div className="mfield" style={{ marginBottom: 0 }}>
              <label className="mfield-label">Notes <span className="mfield-opt">Optional</span></label>
              <input
                className="minput"
                placeholder={txFieldConfig.notePlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="merror">{error}</p>}
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
