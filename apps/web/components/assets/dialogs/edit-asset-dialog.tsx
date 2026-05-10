'use client'

import { useEffect, useRef, useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, CurrencyCode, Asset, Portfolio } from '@networth/types'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { useSymbolLookup, type LookupStatus } from '@/lib/hooks/use-symbol-lookup'
import { SymbolSearchInput } from './symbol-search-input'
import type { SymbolResult } from '@/lib/hooks/use-symbol-search'

const NO_SYMBOL_TYPES: AssetType[] = ['real_estate', 'cash', 'business', 'transport', 'deposit', 'other']

interface Props {
  asset: Asset
  portfolios: Portfolio[]
  onClose: () => void
}

export function EditAssetDialog({ asset, portfolios, onClose }: Props) {
  const router = useRouter()
  const { lookup, lookupNow, cancel, loading: lookupLoading } = useSymbolLookup()
  const nameRef = useRef<HTMLInputElement>(null)
  const symbolRef = useRef<HTMLInputElement>(null)

  const [assetType, setAssetType] = useState<AssetType>(asset.asset_type)
  const [symbol, setSymbol] = useState(asset.symbol ?? '')
  const [assetName, setAssetName] = useState(asset.asset_name)
  const [currency, setCurrency] = useState<CurrencyCode>(asset.currency)
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(asset.portfolio_id)
  const [manualPrice, setManualPrice] = useState(asset.manual_price != null ? String(asset.manual_price) : '')
  const [manualPriceDate, setManualPriceDate] = useState(asset.manual_price_date ?? '')
  const [notes, setNotes] = useState(asset.notes ?? '')
  const [autoFilled, setAutoFilled] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsSymbol = !NO_SYMBOL_TYPES.includes(assetType)

  useModalClose(onClose)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (NO_SYMBOL_TYPES.includes(assetType)) nameRef.current?.focus()
    else symbolRef.current?.focus()
  }, [assetType])

  useEffect(() => {
    if (!needsSymbol || !symbol.trim()) { cancel(); return }
    setLookupStatus('loading')
    lookup(symbol, assetType, ({ name }, status) => {
      setLookupStatus(status)
      if (name) { setAssetName(name); setAutoFilled(true) }
    })
  }, [symbol, assetType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSymbolSelect(result: SymbolResult) {
    const sym = result.exchange ? `${result.exchange}:${result.symbol}` : result.symbol.toUpperCase()
    setSymbol(sym)
    setAutoFilled(false)
    setLookupStatus('loading')
    cancel()
    const info = await lookupNow(sym, assetType)
    const status: LookupStatus = (info.name || info.price !== null) ? 'found' : 'not_found'
    setLookupStatus(status)
    if (info.name) { setAssetName(info.name); setAutoFilled(true) }
    else if (result.name) { setAssetName(result.name); setAutoFilled(true) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assetName.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('assets').update({
      portfolio_id: selectedPortfolioId,
      symbol: symbol ? symbol.toUpperCase() : null,
      asset_name: assetName.trim(),
      asset_type: assetType,
      currency,
      notes: notes.trim() || null,
      manual_price: manualPrice ? Number(manualPrice) : null,
      manual_price_date: manualPriceDate || null,
    }).eq('id', asset.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="rmodal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">Edit asset</div>
            <h2>Edit <em>{asset.symbol ?? asset.asset_name}</em></h2>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Asset type</label>
              <select
                className="minput mselect"
                value={assetType}
                onChange={(e) => {
                  const t = e.target.value as AssetType
                  setAssetType(t)
                  setAutoFilled(false)
                  setLookupStatus('idle')
                }}
              >
                {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {needsSymbol && (
              <div className="mfield">
                <label className="mfield-label">
                  Ticker symbol
                  <span className="mfield-opt">Search to auto-fill name</span>
                </label>
                <SymbolSearchInput
                  value={symbol}
                  onChange={(v) => {
                    setSymbol(v)
                    setAutoFilled(false)
                    setLookupStatus('idle')
                  }}
                  onSelect={handleSymbolSelect}
                  lookupStatus={lookupStatus}
                  lookupLoading={lookupLoading}
                  assetType={assetType}
                  inputRef={symbolRef}
                />
              </div>
            )}

            <div className="mfield-row">
              <div className="mfield" style={{ margin: 0 }}>
                <label className="mfield-label">
                  {needsSymbol ? 'Display name' : 'Asset name'}
                  {needsSymbol && autoFilled && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 400, color: 'var(--accent)' }}>
                      <Sparkles size={10} /> auto-filled
                    </span>
                  )}
                </label>
                <input
                  ref={nameRef}
                  className="minput"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
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

            {portfolios.length > 0 && (
              <div className="mfield">
                <label className="mfield-label">Portfolio</label>
                <select
                  className="minput mselect"
                  value={selectedPortfolioId ?? ''}
                  onChange={(e) => setSelectedPortfolioId(e.target.value || null)}
                >
                  <option value="">— No portfolio —</option>
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!needsSymbol && (
              <div className="mfield">
                <label className="mfield-label">
                  Current market value
                  <span className="mfield-opt">per unit · optional</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="minput mono"
                    placeholder="e.g. 250000"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="date"
                    className="minput"
                    value={manualPriceDate}
                    onChange={(e) => setManualPriceDate(e.target.value)}
                    style={{ width: 148 }}
                  />
                </div>
              </div>
            )}

            <div className="mfield" style={{ marginBottom: 0 }}>
              <label className="mfield-label">Notes <span className="mfield-opt">Optional</span></label>
              <textarea
                className="minput mtextarea"
                placeholder="Thesis, target price, reminders…"
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
                disabled={!assetName.trim() || loading}
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
