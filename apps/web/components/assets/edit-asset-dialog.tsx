'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, CurrencyCode, Asset, Portfolio } from '@networth/types'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { Dialog, DialogFooter, inputStyle } from '@/components/ui/dialog'
import { useSymbolLookup, type LookupStatus } from '@/lib/hooks/use-symbol-lookup'

const NO_SYMBOL_TYPES: AssetType[] = ['real_estate', 'cash', 'business', 'transport', 'deposit', 'other']

interface Props {
  asset: Asset
  portfolios: Portfolio[]
  onClose: () => void
}

export function EditAssetDialog({ asset, portfolios, onClose }: Props) {
  const router = useRouter()
  const { lookup, cancel, loading: lookupLoading } = useSymbolLookup()

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(asset.portfolio_id)
  const [assetType, setAssetType] = useState<AssetType>(asset.asset_type)
  const [symbol, setSymbol] = useState(asset.symbol ?? '')
  const [assetName, setAssetName] = useState(asset.asset_name)
  const [currency, setCurrency] = useState<CurrencyCode>(asset.currency)
  const [notes, setNotes] = useState(asset.notes ?? '')
  const [manualPrice, setManualPrice] = useState<string>(
    asset.manual_price != null ? String(asset.manual_price) : ''
  )
  const [manualPriceDate, setManualPriceDate] = useState<string>(
    asset.manual_price_date ?? ''
  )
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
      .from('assets')
      .update({
        portfolio_id: selectedPortfolioId,
        symbol: symbol ? symbol.toUpperCase() : null,
        asset_name: assetName,
        asset_type: assetType,
        currency,
        notes: notes || null,
        manual_price: manualPrice ? Number(manualPrice) : null,
        manual_price_date: manualPriceDate || null,
      })
      .eq('id', asset.id)

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
    <Dialog title="Edit Asset" subtitle={asset.symbol ?? asset.asset_name} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Type</label>
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
                onChange={(e) => { setSymbol(e.target.value); setAutoFilled(false); setLookupStatus('idle') }}
                placeholder="AAPL"
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

        {!needsSymbol && (
          <div>
            <label style={labelStyle}>
              Current Market Value
              <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 400, color: 'var(--ink-faint)' }}>per unit · optional</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                min="0"
                step="any"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="e.g. 250000"
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="date"
                value={manualPriceDate}
                onChange={(e) => setManualPriceDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ ...inputStyle, width: 140 }}
              />
            </div>
          </div>
        )}

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

        {error && <p style={{ fontSize: 13, color: 'var(--neg)' }}>{error}</p>}

        <DialogFooter onClose={onClose} loading={loading} />
      </form>
    </Dialog>
  )
}
