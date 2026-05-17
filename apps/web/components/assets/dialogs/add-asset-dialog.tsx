'use client'

import { useEffect, useRef, useState } from 'react'
import { useModalClose } from '@/lib/hooks/use-modal-close'
import { useRouter } from 'next/navigation'
import { X, Sparkles, TrendingUp, Coins, Wallet, Home, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, CurrencyCode, Portfolio } from '@networth/types'
import { normalizeAssetSymbol } from '@networth/utils'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { useSymbolLookup, type LookupStatus } from '@/lib/hooks/use-symbol-lookup'
import { SymbolSearchInput } from './symbol-search-input'
import type { SymbolResult } from '@/lib/hooks/use-symbol-search'
import { getAssetTypeConfig, isGramPricedMetal } from '../asset-type-config'

const ASSET_TYPE_CARDS: Array<{ id: AssetType; label: string; desc: string; Icon: React.FC<{ size?: number }> }> = [
  { id: 'stock',        label: 'Stock',        desc: 'Shares, ETFs',         Icon: TrendingUp },
  { id: 'etf',          label: 'ETF',          desc: 'Index funds',          Icon: TrendingUp },
  { id: 'crypto',       label: 'Crypto',       desc: 'Coins & tokens',       Icon: Coins },
  { id: 'cash',         label: 'Cash',         desc: 'Savings, checking',    Icon: Wallet },
  { id: 'real_estate',  label: 'Real estate',  desc: 'Properties',           Icon: Home },
  { id: 'bond',         label: 'Bond',         desc: 'Fixed income',         Icon: TrendingUp },
  { id: 'mutual_fund',  label: 'Mutual fund',  desc: 'Managed funds',        Icon: TrendingUp },
  { id: 'commodity',    label: 'Commodity',    desc: 'Gold, silver, etc.',   Icon: Package },
  { id: 'business',     label: 'Business',     desc: 'Equity, LLC',          Icon: Package },
  { id: 'transport',    label: 'Transport',    desc: 'Vehicles, boats',      Icon: Package },
  { id: 'other',        label: 'Other',        desc: 'Collectibles, misc.',  Icon: Package },
]

interface Props {
  portfolios: Portfolio[]
  userId: string
  defaultPortfolioId?: string | null
  onClose: () => void
}

export function AddAssetDialog({ portfolios, userId, defaultPortfolioId, onClose }: Props) {
  const router = useRouter()
  const { lookup, lookupNow, cancel, loading: lookupLoading } = useSymbolLookup()

  const [step, setStep] = useState<'type' | 'details'>('type')
  const [assetType, setAssetType] = useState<AssetType | null>(null)
  const [symbol, setSymbol] = useState('')
  const [assetName, setAssetName] = useState('')
  const [symbolPresetId, setSymbolPresetId] = useState<string | null>(null)
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(defaultPortfolioId ?? null)
  const [notes, setNotes] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const symbolRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const assetConfig = getAssetTypeConfig(assetType)
  const needsSymbol = assetType ? assetConfig.assetDialog.showSymbol : false
  const symbolPresets = assetConfig.assetDialog.symbolPresets ?? []
  const selectedSymbolPreset = symbolPresets.find((preset) => preset.id === symbolPresetId)
  const selectedPresetRequiresSymbol = selectedSymbolPreset?.symbolRequired !== false
  const showSymbolInput = needsSymbol && (symbolPresets.length === 0 || selectedSymbolPreset?.symbol === null)
  const symbolInputHint = symbolPresets.length > 0
    ? selectedPresetRequiresSymbol ? 'Yahoo Finance symbol' : 'Optional Yahoo Finance symbol'
    : 'Search to auto-fill name'
  const selectedAssetTypeCard = ASSET_TYPE_CARDS.find((item) => item.id === assetType)
  const SelectedAssetTypeIcon = selectedAssetTypeCard?.Icon
  const selectedSymbol = selectedSymbolPreset?.symbol ?? symbol
  const isGramMetal = assetType === 'commodity' && isGramPricedMetal(selectedSymbol)

  useModalClose(onClose)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (step !== 'details') return
    if (!assetType) return
    if (showSymbolInput) symbolRef.current?.focus()
    else nameRef.current?.focus()
  }, [assetType, showSymbolInput, step])

  useEffect(() => {
    if (step !== 'details' || !assetType || !needsSymbol || !symbol.trim()) { cancel(); return }
    setLookupStatus('loading')
    lookup(symbol, assetType, (info, status) => {
      setLookupStatus(status)
      if (info.name) { setAssetName(info.name); setAutoFilled(true) }
      if (info.currency) setCurrency(info.currency as CurrencyCode)
      if (info.description) setNotes((prev) => prev.trim() ? prev : info.description!)
    })
  }, [symbol, assetType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSymbolSelect(result: SymbolResult) {
    const rawSymbol = result.exchange ? `${result.exchange}:${result.symbol}` : result.symbol
    const sym = normalizeAssetSymbol(rawSymbol, assetType ?? '')
    setSymbol(sym)
    setAutoFilled(false)
    setLookupStatus('loading')
    cancel()
    if (assetType) {
      const info = await lookupNow(sym, assetType)
      const status: LookupStatus = (info.name || info.price !== null) ? 'found' : 'not_found'
      setLookupStatus(status)
      if (info.name) { setAssetName(info.name); setAutoFilled(true) }
      else if (result.name) { setAssetName(result.name); setAutoFilled(true) }
      if (info.currency) setCurrency(info.currency as CurrencyCode)
      if (info.description) setNotes((prev) => prev.trim() ? prev : info.description!)
    } else if (result.name) {
      setAssetName(result.name)
      setAutoFilled(true)
    }
  }

  function handleTypeSelect(t: AssetType) {
    if (assetType === t) return
    setAssetType(t)
    setSymbol('')
    setAssetName('')
    setSymbolPresetId(null)
    setAutoFilled(false)
    setLookupStatus('idle')
  }

  function handleSymbolPresetSelect(id: string) {
    setSymbolPresetId(id)
    setAutoFilled(false)
    setLookupStatus('idle')

    const preset = symbolPresets.find((item) => item.id === id)
    if (!preset || preset.symbol === null) {
      setSymbol('')
      setAssetName('')
      return
    }

    setSymbol(preset.symbol)
    setAssetName(preset.name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 'type') {
      if (assetType) setStep('details')
      return
    }
    if (!assetType || !assetName.trim()) return
    if (symbolPresets.length > 0 && (!symbolPresetId || (selectedPresetRequiresSymbol && !symbol.trim()))) return
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

  const canSubmit = !!assetType
    && !!assetName.trim()
    && !loading
    && (symbolPresets.length === 0 || (!!symbolPresetId && (!selectedPresetRequiresSymbol || !!symbol.trim())))
  const canContinue = !!assetType

  return (
    <div
      className="rmodal-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rmodal wide">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">New asset</div>
            {step === 'type' ? (
              <>
                <h2>Choose <em>asset type</em></h2>
                <div className="rmodal-desc">Start with the category so the next fields match the holding.</div>
              </>
            ) : (
              <>
                <h2>Add an <em>asset</em></h2>
                <div className="rmodal-desc">Track a holding manually or pull live prices via ticker symbol.</div>
              </>
            )}
          </div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            {step === 'type' ? (
              <div className="asset-type-step">
                <div className="type-grid asset-type-grid">
                  {ASSET_TYPE_CARDS.map(({ id, label, desc, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`type-card asset-type-card ${assetType === id ? 'selected' : ''}`}
                      onClick={() => handleTypeSelect(id)}
                    >
                      <div className="type-card-icon"><Icon size={15} /></div>
                      <div className="type-card-copy">
                        <div className="type-card-name">{label}</div>
                        <div className="type-card-desc">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {selectedAssetTypeCard && (
                  <div className="asset-type-summary">
                    {SelectedAssetTypeIcon && (
                      <div className="type-card-icon"><SelectedAssetTypeIcon size={14} /></div>
                    )}
                    <div className="type-card-copy">
                      <div className="type-card-name">{selectedAssetTypeCard.label}</div>
                      <div className="type-card-desc">{selectedAssetTypeCard.desc}</div>
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => setStep('type')}>
                      Change
                    </button>
                  </div>
                )}

                {symbolPresets.length > 0 && (
                  <div className="mfield">
                    <label className="mfield-label">{assetConfig.assetDialog.symbolPresetLabel ?? 'Type'}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                      {symbolPresets.map((preset) => {
                        const selected = symbolPresetId === preset.id
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={`type-card ${selected ? 'selected' : ''}`}
                            onClick={() => handleSymbolPresetSelect(preset.id)}
                            style={{
                              minHeight: 54,
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 4,
                              textAlign: 'center',
                            }}
                          >
                            <div className="type-card-name" style={{ fontSize: 12 }}>{preset.label}</div>
                            {preset.symbol && (
                              <div className="type-card-desc mono" style={{ fontSize: 10 }}>{preset.symbol}</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {showSymbolInput && (
                  <div className="mfield">
                    <label className="mfield-label">
                      Ticker symbol
                      <span className="mfield-opt">{symbolInputHint}</span>
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
                      assetType={assetType ?? undefined}
                      placeholder={assetConfig.assetDialog.symbolPlaceholder}
                      inputRef={symbolRef}
                    />
                  </div>
                )}

                <div className="mfield-row">
                  <div className="mfield" style={{ margin: 0 }}>
                    <label className="mfield-label">
                      {needsSymbol ? 'Display name' : 'Asset name'}
                      {needsSymbol && autoFilled && (
                        <span className="mautofill">
                          <Sparkles size={10} /> auto-filled
                        </span>
                      )}
                    </label>
                    <input
                      ref={nameRef}
                      className="minput"
                      placeholder={assetConfig.assetDialog.displayNamePlaceholder}
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      required={symbolPresets.length === 0 || symbolPresetId !== null}
                      disabled={symbolPresets.length > 0 && symbolPresetId === null}
                    />
                  </div>
                  <div className="mfield" style={{ margin: 0 }}>
                    <label className="mfield-label">Currency</label>
                    <CurrencyPicker
                      value={currency}
                      onChange={(c) => setCurrency(c as CurrencyCode)}
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
                    placeholder={assetConfig.assetDialog.notesPlaceholder}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <p className="mnote">
                  {isGramMetal
                    ? 'Gold and silver quantities use grams; prices and cost basis are tracked per gram.'
                    : 'Quantity and cost basis are calculated automatically from your transactions. Add transactions after creating the asset.'}
                </p>

                {error && <p className="merror">{error}</p>}
              </>
            )}
          </div>

          <div className="rmodal-foot">
            <div className="rmodal-hint">
              <Sparkles size={11} /> Price data reflects today&apos;s market — exact current price not guaranteed
            </div>
            <div className="rmodal-actions">
              {step === 'type' ? (
                <>
                  <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canContinue}
                    style={{ opacity: canContinue ? 1 : 0.5 }}
                    onClick={() => { if (assetType) setStep('details') }}
                  >
                    Continue
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep('type')}>Back</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!canSubmit}
                    style={{ opacity: canSubmit ? 1 : 0.5 }}
                  >
                    Add asset
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
