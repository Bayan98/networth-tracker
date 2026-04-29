'use client'

import { useEffect, useRef, useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X, Sparkles, TrendingUp, Coins, Wallet, Home, Package, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, CurrencyCode, Portfolio } from '@networth/types'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { useSymbolLookup, type LookupStatus } from '@/lib/hooks/use-symbol-lookup'

const ASSET_TYPE_CARDS: Array<{ id: AssetType; label: string; desc: string; Icon: React.FC<{ size?: number }> }> = [
  { id: 'stock',        label: 'Stock',        desc: 'Shares, ETFs',         Icon: TrendingUp },
  { id: 'etf',          label: 'ETF',          desc: 'Index funds',          Icon: TrendingUp },
  { id: 'crypto',       label: 'Crypto',       desc: 'Coins & tokens',       Icon: Coins },
  { id: 'cash',         label: 'Cash',         desc: 'Savings, checking',    Icon: Wallet },
  { id: 'real_estate',  label: 'Real estate',  desc: 'Properties',           Icon: Home },
  { id: 'bond',         label: 'Bond',         desc: 'Fixed income',         Icon: TrendingUp },
  { id: 'mutual_fund',  label: 'Mutual fund',  desc: 'Managed funds',        Icon: TrendingUp },
  { id: 'commodity',    label: 'Commodity',    desc: 'Gold, silver, etc.',   Icon: Package },
  { id: 'deposit',      label: 'Deposit',      desc: 'CDs, term deposits',   Icon: Wallet },
  { id: 'business',     label: 'Business',     desc: 'Equity, LLC',          Icon: Package },
  { id: 'transport',    label: 'Transport',    desc: 'Vehicles, boats',      Icon: Package },
  { id: 'other',        label: 'Other',        desc: 'Collectibles, misc.',  Icon: Package },
]

const NO_SYMBOL_TYPES: AssetType[] = ['real_estate', 'cash', 'business', 'transport', 'other', 'deposit']

interface Props {
  portfolios: Portfolio[]
  userId: string
  defaultPortfolioId?: string | null
  onClose: () => void
}

export function AddAssetDialog({ portfolios, userId, defaultPortfolioId, onClose }: Props) {
  const router = useRouter()
  const { lookup, cancel, loading: lookupLoading } = useSymbolLookup()

  const [assetType, setAssetType] = useState<AssetType | null>(null)
  const [symbol, setSymbol] = useState('')
  const [assetName, setAssetName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(defaultPortfolioId ?? null)
  const [notes, setNotes] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const symbolRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const needsSymbol = assetType ? !NO_SYMBOL_TYPES.includes(assetType) : false

  useModalClose(onClose)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (!assetType) return
    if (NO_SYMBOL_TYPES.includes(assetType)) nameRef.current?.focus()
    else symbolRef.current?.focus()
  }, [assetType])

  useEffect(() => {
    if (!assetType || !needsSymbol || !symbol.trim()) { cancel(); return }
    setLookupStatus('loading')
    lookup(symbol, assetType, ({ name }, status) => {
      setLookupStatus(status)
      if (name) { setAssetName(name); setAutoFilled(true) }
    })
  }, [symbol, assetType]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTypeSelect(t: AssetType) {
    if (assetType === t) return
    setAssetType(t)
    setSymbol('')
    setAssetName('')
    setAutoFilled(false)
    setLookupStatus('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assetType || !assetName.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('assets').insert({
      portfolio_id: selectedPortfolioId,
      user_id: userId,
      symbol: symbol.trim() ? symbol.trim().toUpperCase() : null,
      asset_name: assetName.trim(),
      asset_type: assetType,
      currency,
      notes: notes.trim() || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  const canSubmit = !!assetType && !!assetName.trim() && !loading

  return (
    <div
      className="rmodal-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rmodal wide">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">New asset</div>
            <h2>Add an <em>asset</em></h2>
            <div className="rmodal-desc">Track a holding manually or pull live prices via ticker symbol.</div>
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Asset type</label>
              <div className="type-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                {ASSET_TYPE_CARDS.map(({ id, label, desc, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`type-card ${assetType === id ? 'selected' : ''}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    onClick={() => handleTypeSelect(id)}
                  >
                    <div className="type-card-icon" style={{ flexShrink: 0 }}><Icon size={14} /></div>
                    <div>
                      <div className="type-card-name" style={{ fontSize: 12 }}>{label}</div>
                      <div className="type-card-desc" style={{ fontSize: 10 }}>{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {assetType && (
              <>
                {needsSymbol && (
                  <div className="mfield" style={{ position: 'relative' }}>
                    <label className="mfield-label">
                      Ticker symbol
                      <span className="mfield-opt">Search to auto-fill name</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        ref={symbolRef}
                        className="minput mono"
                        placeholder="e.g. AAPL, BTC, VOO"
                        value={symbol}
                        onChange={(e) => {
                          setSymbol(e.target.value.toUpperCase())
                          setAutoFilled(false)
                          setLookupStatus('idle')
                        }}
                      />
                      {lookupLoading && (
                        <Loader2 size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', animation: 'spin 1s linear infinite' }} />
                      )}
                      {!lookupLoading && lookupStatus === 'not_found' && (
                        <AlertCircle size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--warn)' }} />
                      )}
                    </div>
                    {lookupStatus === 'not_found' && (
                      <p style={{ fontSize: 11, color: 'var(--warn)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={10} /> Symbol not found — fill in the name manually
                      </p>
                    )}
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
                      placeholder={
                        assetType === 'real_estate' ? 'e.g. Primary residence'
                        : assetType === 'cash' ? 'e.g. Marcus High-Yield Savings'
                        : 'e.g. Apple Inc.'
                      }
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

                <div className="mfield" style={{ marginBottom: 0 }}>
                  <label className="mfield-label">
                    Notes <span className="mfield-opt">Optional</span>
                  </label>
                  <textarea
                    className="minput mtextarea"
                    placeholder="Thesis, target price, sell trigger…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
                  Quantity and cost basis are calculated automatically from your transactions. Add transactions after creating the asset.
                </p>

                {error && <p style={{ fontSize: 13, color: 'var(--neg)', marginTop: 8 }}>{error}</p>}
              </>
            )}
          </div>

          <div className="rmodal-foot">
            <div className="rmodal-hint">
              <Sparkles size={11} /> Price data reflects today's market — exact current price not guaranteed
            </div>
            <div className="rmodal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmit}
                style={{ opacity: canSubmit ? 1 : 0.5 }}
              >
                Add asset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
