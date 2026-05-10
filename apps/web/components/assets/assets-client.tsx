'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatPercent, ASSET_TYPE_LABELS } from '@networth/utils'
import type { Portfolio, Asset, CurrencyCode, AssetType } from '@networth/types'
import { usePortfolioValuation } from '@/lib/hooks/use-portfolio-valuation'
import { getAssetsViewState, setAssetsViewState } from '@/lib/assets-view-state'
import { AssetsChart } from './assets-chart'
import { PortfolioClient } from './portfolio-client'
import { AddAssetDialog } from './add-asset-dialog'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import type { Period } from '@/components/ui/area-chart'

type SortKey = 'value-desc' | 'value-asc' | 'alpha' | 'abs-gain' | 'abs-loss' | 'rel-gain' | 'rel-loss'

const SORT_LABELS: Record<SortKey, string> = {
  'value-desc': 'Value ↓',
  'value-asc':  'Value ↑',
  'alpha':      'A → Z',
  'abs-gain':   'Abs. gainers',
  'abs-loss':   'Abs. losers',
  'rel-gain':   'Rel. gainers %',
  'rel-loss':   'Rel. losers %',
}

interface Props {
  portfolios: Portfolio[]
  assets: Asset[]
  currency: CurrencyCode
  userId: string
  initialPortfolioId?: string | null
  portfolioName?: string
}

function MiniStat({ label, value, sub, trend }: {
  label: string; value: string; sub: string; trend?: 'pos' | 'neg'
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val" style={{ fontSize: 20, marginBottom: 4 }}>{value}</div>
      <div className="kpi-sub" style={{ color: trend === 'pos' ? 'var(--pos)' : trend === 'neg' ? 'var(--neg)' : 'var(--ink-faint)' }}>
        {sub}
      </div>
    </div>
  )
}

export function AssetsClient({ portfolios, assets, currency, userId, initialPortfolioId, portfolioName }: Props) {
  const pathname = usePathname()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const setSelectedCurrency = useAppStore((s) => s.setSelectedCurrency)

  const currencyInitRef = useRef(false)
  useEffect(() => {
    if (!currencyInitRef.current) {
      currencyInitRef.current = true
      if (selectedCurrency === 'USD' && currency !== 'USD') setSelectedCurrency(currency)
    }
  }, [])

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(initialPortfolioId ?? null)
  const [selectedTypes, setSelectedTypes] = useState<Set<AssetType>>(new Set())
  const [sortOpen, setSortOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('value-desc')
  const [period, setPeriod] = useState<Period>('1w')
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [cacheReady, setCacheReady] = useState(false)

  const byPortfolio = selectedPortfolioId
    ? assets.filter((h) => h.portfolio_id === selectedPortfolioId)
    : assets

  const visible = selectedTypes.size > 0
    ? byPortfolio.filter((h) => selectedTypes.has(h.asset_type as AssetType))
    : byPortfolio

  const allTypes = Array.from(new Set(byPortfolio.map((h) => h.asset_type))) as AssetType[]
  const assetsViewPath = pathname.startsWith('/portfolios/') && selectedPortfolioId === initialPortfolioId
    ? pathname
    : '/assets'

  const {
    valuations,
    liveSeries,
    totalValue,
    totalCostBasis,
    totalGainPct,
    periodChangeAbs,
    periodChangePct,
    todayChangeAbs,
    todayChangePct,
    loading: baseLoading,
    chartLoading,
    fxError,
    priceError,
  } = usePortfolioValuation(visible, period, selectedCurrency, { priceAssets: assets })

  useEffect(() => {
    const cached = getAssetsViewState()
    if (!cached) {
      setCacheReady(true)
      return
    }

    const portfolioIds = new Set(portfolios.map((p) => p.id))
    const cachedPortfolioId = cached.selectedPortfolioId && portfolioIds.has(cached.selectedPortfolioId)
      ? cached.selectedPortfolioId
      : null
    const nextPortfolioId = initialPortfolioId !== undefined ? initialPortfolioId : cachedPortfolioId
    const assetsForPortfolio = nextPortfolioId
      ? assets.filter((h) => h.portfolio_id === nextPortfolioId)
      : assets
    const validTypes = new Set(assetsForPortfolio.map((h) => h.asset_type))
    const nextTypes = cached.selectedTypes.filter((t) => validTypes.has(t))

    setSelectedPortfolioId(nextPortfolioId ?? null)
    setSelectedTypes(new Set(nextTypes))
    if (cached.period) setPeriod(cached.period)
    setCacheReady(true)
  }, [assets, initialPortfolioId, portfolios])

  useEffect(() => {
    if (!cacheReady) return
    setAssetsViewState({
      path: assetsViewPath,
      selectedPortfolioId,
      selectedTypes: Array.from(selectedTypes),
      period,
    })
  }, [assetsViewPath, cacheReady, period, selectedPortfolioId, selectedTypes])

  function saveCurrentView() {
    setAssetsViewState({
      path: assetsViewPath,
      selectedPortfolioId,
      selectedTypes: Array.from(selectedTypes),
      period,
    })
  }

  function handlePortfolioSelect(id: string | null) {
    setSelectedPortfolioId(id)
    setSelectedTypes(new Set())
  }

  function toggleType(t: AssetType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function openAsset(assetId: string) {
    saveCurrentView()
    window.location.href = `/assets/${assetId}`
  }

  const sorted = [...valuations].sort((a, b) => {
    switch (sortBy) {
      case 'alpha':      return a.asset.asset_name.localeCompare(b.asset.asset_name)
      case 'value-desc': return (b.value ?? 0) - (a.value ?? 0)
      case 'value-asc':  return (a.value ?? 0) - (b.value ?? 0)
      case 'abs-gain':   return (b.priceReturnAbs ?? 0) - (a.priceReturnAbs ?? 0)
      case 'abs-loss':   return (a.priceReturnAbs ?? 0) - (b.priceReturnAbs ?? 0)
      case 'rel-gain':   return (b.priceReturnPct ?? 0) - (a.priceReturnPct ?? 0)
      case 'rel-loss':   return (a.priceReturnPct ?? 0) - (b.priceReturnPct ?? 0)
    }
  })

  const portfolioMap = Object.fromEntries(portfolios.map((p) => [p.id, p.name]))
  const portfolioCount = new Set(visible.map((h) => h.portfolio_id).filter(Boolean)).size

  const fmt = (v: number | null, withSign = false, loading = baseLoading) => {
    if (hideAmounts) return '••••••'
    if (loading || v === null) return '—'
    return withSign
      ? `${v >= 0 ? '+' : ''}${formatCurrency(v, selectedCurrency)}`
      : formatCurrency(v, selectedCurrency)
  }
  const fmtPct = (v: number | null, loading = baseLoading) => {
    if (hideAmounts || loading || v === null) return '—'
    return formatPercent(v)
  }

  return (
    <>
      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="empty-label">{portfolioName ? 'Portfolio' : 'Holdings'}</div>
          <h1>
            {portfolioName ?? 'My Assets'} <em>{portfolioName ? '& positions.' : ''}</em>
          </h1>
          <p>
            {visible.length} holding{visible.length !== 1 ? 's' : ''}{' '}
            {!portfolioName && portfolioCount > 0 && `with ${portfolioCount} portfolio${portfolioCount !== 1 ? 's' : ''}`}.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddAsset(true)}>
          <Plus size={14} /> Add asset
        </button>
      </div>

      {(fxError || priceError) && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'color-mix(in oklch, var(--warn) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--warn) 30%, transparent)', fontSize: 13, color: 'var(--warn)' }}>
          {fxError && <p>{fxError}</p>}
          {priceError && <p>{priceError}</p>}
        </div>
      )}

      {/* Category type filter + portfolio selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {allTypes.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allTypes.map((t) => {
              const active = selectedTypes.has(t)
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="btn"
                  style={{
                    fontSize: 12,
                    padding: '5px 10px',
                    background: active ? 'color-mix(in oklch, var(--accent) 12%, transparent)' : 'var(--surface)',
                    color: active ? 'var(--accent)' : 'var(--ink-muted)',
                    border: `1px solid ${active ? 'color-mix(in oklch, var(--accent) 35%, transparent)' : 'var(--border)'}`,
                  }}
                >
                  {ASSET_TYPE_LABELS[t] ?? t}
                </button>
              )
            })}
          </div>
        )}
        <PortfolioClient
          portfolios={portfolios}
          selectedId={selectedPortfolioId}
          onSelect={handlePortfolioSelect}
          userId={userId}
        />
      </div>

      {/* Mini stats — below categories, above chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--density-gap)' }}>
        <MiniStat
          label="Total value"
          value={fmt(totalValue)}
          sub={fmtPct(totalGainPct)}
          trend={totalGainPct !== null ? (totalGainPct >= 0 ? 'pos' : 'neg') : undefined}
        />
        <MiniStat
          label="Cost basis"
          value={fmt(totalCostBasis)}
          sub="Invested"
        />
        <MiniStat
          label="Period change"
          value={fmt(periodChangeAbs, true, chartLoading)}
          sub={fmtPct(periodChangePct, chartLoading)}
          trend={!chartLoading && periodChangeAbs !== null ? (periodChangeAbs >= 0 ? 'pos' : 'neg') : undefined}
        />
        <MiniStat
          label="Today"
          value={fmt(todayChangeAbs, true)}
          sub={fmtPct(todayChangePct)}
          trend={todayChangeAbs !== null ? (todayChangeAbs >= 0 ? 'pos' : 'neg') : undefined}
        />
      </div>

      <AssetsChart
        series={liveSeries}
        currency={selectedCurrency}
        loading={chartLoading}
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Holdings table */}
      <div className="table-wrap">
        <div className="table-head">
          <h3>Holdings</h3>

          {visible.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className="btn btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '5px 10px',
                  color: sortBy !== 'value-desc' ? 'var(--accent)' : undefined,
                }}
              >
                <SlidersHorizontal size={11} />
                Sort
                {sortBy !== 'value-desc' && (
                  <span style={{ fontSize: 10, opacity: 0.65 }}>· {SORT_LABELS[sortBy]}</span>
                )}
              </button>

              {sortOpen && (
                <div
                  style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 4,
                    zIndex: 50, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
                    padding: '4px 0', minWidth: 160,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }}
                  onMouseLeave={() => setSortOpen(false)}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setSortOpen(false) }}
                      style={{
                        display: 'block', width: '100%', padding: '6px 14px',
                        textAlign: 'left', fontSize: 13, border: 'none',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        color: sortBy === key ? 'var(--accent)' : 'var(--ink)',
                        background: sortBy === key ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent',
                      } as React.CSSProperties}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p className="empty-label">
              {assets.length === 0 ? 'No assets yet. Add your first position.' : 'No assets match the selected filters.'}
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Portfolio</th>
                <th className="num">Price</th>
                <th className="num">Change</th>
                <th className="num">Value</th>
                <th className="num">Share</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ asset, qty, price, priceCcy, value, priceReturnAbs, priceReturnPct }) => {
                const portfolio = asset.portfolio_id ? portfolioMap[asset.portfolio_id] : null
                const isPositive = priceReturnAbs !== null && priceReturnAbs >= 0
                const share = totalValue && value !== null ? (value / totalValue) * 100 : null
                return (
                  <tr
                    key={asset.id}
                    onClick={() => openAsset(asset.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AssetAvatar symbol={asset.symbol} assetType={asset.asset_type} name={asset.asset_name} size={32} borderRadius={8} />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {asset.symbol ?? asset.asset_name}
                            {asset.symbol && (
                              <span style={{ fontWeight: 400, color: 'var(--ink-muted)', marginLeft: 6, fontSize: 12 }}>
                                {asset.asset_name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                            {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                      {portfolio ?? ''}
                    </td>
                    <td className="num" style={{ fontSize: 12 }}>
                      {hideAmounts ? '••••' : baseLoading ? '…' : (
                        <>
                          {qty !== 1 && (
                            <span style={{ color: 'var(--ink-faint)', marginRight: 4 }}>
                              {qty.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                              <span style={{ margin: '0 3px', opacity: 0.45 }}>|</span>
                            </span>
                          )}
                          {formatCurrency(price, priceCcy)}
                        </>
                      )}
                    </td>
                    <td className="num">
                      {!hideAmounts && priceReturnAbs !== null && priceReturnPct !== null ? (
                        <span className={`delta-pill ${isPositive ? 'pos' : 'neg'}`}>
                          {formatPercent(priceReturnPct)}
                        </span>
                      ) : ''}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {hideAmounts ? '••••••' : baseLoading ? '—' : value !== null ? formatCurrency(value, selectedCurrency) : '—'}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                      {share !== null ? `${share.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddAsset && (
        <AddAssetDialog
          portfolios={portfolios}
          userId={userId}
          defaultPortfolioId={selectedPortfolioId}
          onClose={() => setShowAddAsset(false)}
        />
      )}
    </>
  )
}
