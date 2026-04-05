'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, CurrencyCode, Holding, Portfolio } from '@networth/types'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { useSymbolLookup, type LookupStatus } from '@/lib/hooks/use-symbol-lookup'

const NO_SYMBOL_TYPES: AssetType[] = ['real_estate', 'cash', 'business', 'transport', 'other']

interface Props {
  holding: Holding
  portfolios: Portfolio[]
  onClose: () => void
}

export function EditHoldingDialog({ holding, portfolios, onClose }: Props) {
  const router = useRouter()
  const { lookup, cancel, loading: lookupLoading } = useSymbolLookup()

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(holding.portfolio_id)
  const [assetType, setAssetType] = useState<AssetType>(holding.asset_type)
  const [symbol, setSymbol] = useState(holding.symbol ?? '')
  const [assetName, setAssetName] = useState(holding.asset_name)
  const [currency, setCurrency] = useState<CurrencyCode>(holding.currency)
  const [notes, setNotes] = useState(holding.notes ?? '')
  const [autoFilled, setAutoFilled] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsSymbol = !NO_SYMBOL_TYPES.includes(assetType)

  useEffect(() => {
    if (!needsSymbol || !symbol.trim()) { cancel(); return }
    setLookupStatus('loading')
    lookup(symbol, assetType, ({ name }, status) => {
      setLookupStatus(status)
      if (name) { setAssetName(name); setAutoFilled(true) }
    })
  }, [symbol, assetType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('holdings')
      .update({
        portfolio_id: selectedPortfolioId,
        symbol: symbol ? symbol.toUpperCase() : null,
        asset_name: assetName,
        asset_type: assetType,
        currency,
        notes: notes || null,
      })
      .eq('id', holding.id)

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
          <div>
            <h2 className="text-base font-semibold">Edit Holding</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              {holding.symbol ?? holding.asset_name}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

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

          {needsSymbol && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Symbol</label>
              <div className="relative">
                <input
                  value={symbol}
                  onChange={(e) => { setSymbol(e.target.value); setAutoFilled(false); setLookupStatus('idle') }}
                  placeholder="AAPL"
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
          )}

          {lookupStatus === 'not_found' && (
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warning, #f59e0b)' }}>
              <AlertCircle size={11} />
              Symbol not found — fill in the name manually
            </p>
          )}

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              Name
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
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
