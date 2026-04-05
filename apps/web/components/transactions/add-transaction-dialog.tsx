'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Portfolio, TransactionType, CurrencyCode } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

interface Props {
  portfolios: Portfolio[]
  userId: string
  holdingId?: string
  defaultSymbol?: string
  defaultCurrency?: CurrencyCode
  onClose: () => void
}

const TX_TYPES: TransactionType[] = [
  'buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal', 'fee', 'transfer',
]

export function AddTransactionDialog({ portfolios, userId, holdingId, defaultSymbol, defaultCurrency, onClose }: Props) {
  const router = useRouter()
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '')
  const [symbol, setSymbol] = useState(defaultSymbol ?? '')
  const [txType, setTxType] = useState<TransactionType>('buy')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('0')
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency ?? 'USD')
  const [executedAt, setExecutedAt] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const qty = parseFloat(quantity)
    const priceVal = parseFloat(price)
    const feeVal = parseFloat(fee) || 0
    const total = qty * priceVal

    const supabase = createClient()
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      portfolio_id: portfolioId || null,
      holding_id: holdingId ?? null,
      symbol: symbol.toUpperCase(),
      transaction_type: txType,
      quantity: qty,
      price_per_unit: priceVal,
      total_amount: total,
      fee: feeVal,
      currency,
      executed_at: new Date(executedAt).toISOString(),
      notes: notes || null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  const inputStyle = {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-sm rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Add Transaction</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {portfolios.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Portfolio</label>
              <select
                value={portfolioId}
                onChange={(e) => setPortfolioId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              >
                <option value="">— No portfolio —</option>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Symbol</label>
              <input
                value={symbol}
                onChange={(e) => { if (!holdingId) setSymbol(e.target.value) }}
                placeholder="AAPL"
                required
                readOnly={!!holdingId}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none uppercase"
                style={{ ...inputStyle, ...(holdingId ? { opacity: 0.7 } : {}) }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none capitalize"
                style={inputStyle}
              >
                {TX_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                min="0"
                step="any"
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Price / unit</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                min="0"
                step="any"
                required
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fee</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0"
                min="0"
                step="any"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Currency</label>
              <CurrencyPicker
                value={currency}
                onChange={(c) => setCurrency(c as CurrencyCode)}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date &amp; time</label>
            <input
              type="datetime-local"
              value={executedAt}
              onChange={(e) => setExecutedAt(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
