'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTxFxRate } from '@/lib/hooks/use-tx-fx-rate'
import { TRANSACTION_TYPE_LABELS, formatCurrency } from '@networth/utils'
import type { Transaction, TransactionType, CurrencyCode } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'

interface Props {
  transaction: Transaction
  assetCurrency?: string
  onClose: () => void
}

const TX_TYPES: TransactionType[] = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'split']

export function EditTransactionDialog({ transaction, assetCurrency, onClose }: Props) {
  const router = useRouter()
  const [txType, setTxType] = useState<TransactionType>(transaction.transaction_type)
  const [quantity, setQuantity] = useState(String(transaction.quantity))
  const [price, setPrice] = useState(String(transaction.price))
  const [currency, setCurrency] = useState<CurrencyCode>(transaction.currency)
  const [executedAt, setExecutedAt] = useState(new Date(transaction.executed_at).toISOString().slice(0, 16))
  const [notes, setNotes] = useState(transaction.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsFx = !!assetCurrency && currency.toUpperCase() !== assetCurrency.toUpperCase()
  const { rate: fxRate, loading: fxLoading } = useTxFxRate(currency, assetCurrency, executedAt.slice(0, 10))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('transactions').update({
      transaction_type: txType,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      currency,
      executed_at: new Date(executedAt).toISOString(),
      notes: notes || null,
    }).eq('id', transaction.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  const priceNum = parseFloat(price)
  const convertedPrice = needsFx && !isNaN(priceNum) ? priceNum * fxRate : null

  return (
    <Dialog title="Edit Transaction" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <select value={txType} onChange={(e) => setTxType(e.target.value as TransactionType)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            {TX_TYPES.map((t) => <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t] ?? t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantity</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Price / unit</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
            {convertedPrice != null && (
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {fxLoading
                  ? 'Fetching rate…'
                  : `≈ ${formatCurrency(convertedPrice, assetCurrency!)} in ${assetCurrency}`}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Currency</label>
          <CurrencyPicker value={currency} onChange={(c) => setCurrency(c as CurrencyCode)} style={inputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date &amp; time</label>
          <input type="datetime-local" value={executedAt} onChange={(e) => setExecutedAt(e.target.value)} required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
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
