'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, CurrencyCode, Portfolio } from '@networth/types'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'
import { useSymbolLookup, type LookupStatus } from '@/lib/hooks/use-symbol-lookup'

const NO_SYMBOL_TYPES: AssetType[] = ['real_estate', 'cash', 'business', 'transport', 'other']

interface Props {
  portfolios: Portfolio[]
  userId: string
  defaultPortfolioId?: string | null
  onClose: () => void
}

export function AddAssetDialog({ portfolios, userId, defaultPortfolioId, onClose }: Props) {
  const router = useRouter()
  const { lookup, cancel, loading: lookupLoading } = useSymbolLookup()

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(defaultPortfolioId ?? null)
  const [assetType, setAssetType] = useState<AssetType | ''>('')
  const [symbol, setSymbol] = useState('')
  const [assetName, setAssetName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [notes, setNotes] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsSymbol = assetType && !NO_SYMBOL_TYPES.includes(assetType as AssetType)

  useEffect(() => {
    if (!assetType || !needsSymbol || !symbol.trim()) {
      cancel()
      return
    }
    setLookupStatus('loading')
    lookup(symbol, assetType as AssetType, ({ name }, status) => {
      setLookupStatus(status)
      if (name) { setAssetName(name); setAutoFilled(true) }
    })
  }, [symbol, assetType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assetType) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('assets').insert({
      portfolio_id: selectedPortfolioId,
      user_id: userId,
      symbol: symbol ? symbol.toUpperCase() : null,
      asset_name: assetName,
      asset_type: assetType,
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

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--ink-muted)', display: 'block', marginBottom: 5 }

  return (
    <Dialog title="Add Asset" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select
            value={assetType}
            onChange={(e) => {
              setAssetType(e.target.value as AssetType)
              setSymbol('')
              setAssetName('')
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

        {assetType && (
          <>
            {portfolios.length > 0 && (
              <div>
                <label style={labelStyle}>Portfolio</label>
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
              <div>
                <label style={labelStyle}>Symbol</label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value)
                      setAutoFilled(false)
                      setLookupStatus('idle')
                    }}
                    placeholder="AAPL"
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none uppercase"
                    style={inputStyle}
                  />
                  {lookupLoading && (
                    <Loader2 size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', animation: 'spin 1s linear infinite' }} />
                  )}
                  {!lookupLoading && lookupStatus === 'not_found' && (
                    <AlertCircle size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--warn)' }} />
                  )}
                </div>
              </div>
            )}

            {lookupStatus === 'not_found' && (
              <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--warn)' }}>
                <AlertCircle size={11} />
                Symbol not found — fill in the name manually
              </p>
            )}

            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                Name
                {autoFilled && assetName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 400, color: 'var(--accent)' }}>
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

            <div>
              <label style={labelStyle}>Currency</label>
              <CurrencyPicker value={currency} onChange={(c) => setCurrency(c as CurrencyCode)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <p style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              Quantity and cost basis are calculated automatically from transactions.
            </p>

            {error && <p style={{ fontSize: 13, color: 'var(--neg)' }}>{error}</p>}

            <DialogFooter onClose={onClose} loading={loading} saveLabel="Add" />
          </>
        )}

        {!assetType && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ justifyContent: 'center' }}
          >
            Cancel
          </button>
        )}
      </form>
    </Dialog>
  )
}
