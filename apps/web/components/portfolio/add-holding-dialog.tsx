'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, CurrencyCode, Portfolio } from '@networth/types'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { useSymbolLookup, type LookupStatus } from '@/lib/hooks/use-symbol-lookup'

interface Props {
  portfolios: Portfolio[]
  userId: string
  onClose: () => void
}

export function AddHoldingDialog({ portfolios, userId, onClose }: Props) {
  const router = useRouter()
  const { lookup, cancel, loading: lookupLoading } = useSymbolLookup()

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [assetType, setAssetType] = useState<AssetType | ''>('')
  const [symbol, setSymbol] = useState('')
  const [assetName, setAssetName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [notes, setNotes] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Trigger lookup whenever symbol or assetType changes
  useEffect(() => {
    if (!assetType || !symbol.trim()) {
      cancel()
      return
    }
    setLookupStatus('loading')
    lookup(symbol, assetType as AssetType, ({ name, price }, status) => {
      setLookupStatus(status)
      if (name) setAssetName(name)
      if (price !== null) setAvgCost(String(price))
      if (name || price !== null) setAutoFilled(true)
    })
  }, [symbol, assetType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assetType) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('holdings').insert({
      portfolio_id: selectedPortfolioId,
      user_id: userId,
      symbol: symbol.toUpperCase(),
      asset_name: assetName,
      asset_type: assetType,
      quantity: parseFloat(quantity),
      average_cost_basis: parseFloat(avgCost),
      currency,
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
          <h2 className="text-base font-semibold">Add Holding</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type always shown first */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <select
              value={assetType}
              onChange={(e) => {
                setAssetType(e.target.value as AssetType)
                setSymbol('')
                setAssetName('')
                setAvgCost('')
                setAutoFilled(false)
              }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
              required
            >
              <option value="">— Select type —</option>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Rest appears only after type is selected */}
          {assetType && (
            <>
              {portfolios.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Portfolio</label>
                  <select
                    value={selectedPortfolioId ?? ''}
                    onChange={(e) => setSelectedPortfolioId(e.target.value || null)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  >
                    <option value="">— No portfolio —</option>
                    {portfolios.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Symbol</label>
                <div className="relative">
                  <input
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value)
                      setAutoFilled(false)
                      setLookupStatus('idle')
                    }}
                    placeholder="AAPL"
                    required
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none uppercase"
                    style={inputStyle}
                  />
                  {lookupLoading && (
                    <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--color-muted-foreground)' }} />
                  )}
                  {!lookupLoading && lookupStatus === 'not_found' && (
                    <AlertCircle size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-warning, #f59e0b)' }} />
                  )}
                </div>
              </div>

              {lookupStatus === 'not_found' && (
                <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warning, #f59e0b)' }}>
                  <AlertCircle size={11} />
                  Symbol not found — fill in the name and price manually
                </p>
              )}

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  Asset name
                  {autoFilled && assetName && (
                    <span className="flex items-center gap-1 text-xs font-normal" style={{ color: 'var(--color-accent)' }}>
                      <Sparkles size={10} /> auto-filled
                    </span>
                  )}
                </label>
                <input
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Apple Inc."
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
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
                  <label className="flex items-center gap-1.5 text-sm font-medium">
                    Avg cost
                    {autoFilled && avgCost && (
                      <span className="flex items-center gap-1 text-xs font-normal" style={{ color: 'var(--color-accent)' }}>
                        <Sparkles size={10} /> current
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                    placeholder="150.00"
                    min="0"
                    step="any"
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency</label>
                <CurrencyPicker
                  value={currency}
                  onChange={(c) => setCurrency(c as CurrencyCode)}
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
                <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
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
                  {loading ? 'Adding…' : 'Add'}
                </button>
              </div>
            </>
          )}

          {!assetType && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
