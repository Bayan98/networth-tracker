'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatPercent, ASSET_TYPE_LABELS, resolveAssetPrice, PRICEABLE_TYPES } from '@networth/utils'
import type { Portfolio, Asset, CurrencyCode, AssetType } from '@networth/types'
import { usePrices } from '@/lib/hooks/use-prices'
import { usePortfolioHistory } from '@/lib/hooks/use-portfolio-history'
import { AssetsChart } from './assets-chart'
import { PortfolioClient } from './portfolio-client'
import { AddAssetDialog } from './add-asset-dialog'
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
}

export function AssetsClient({ portfolios, assets, currency, userId }: Props) {
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

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<AssetType>>(new Set())
  const [sortOpen, setSortOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('value-desc')
  const [period, setPeriod] = useState<Period>('1y')
  const [showAddAsset, setShowAddAsset] = useState(false)

  const byPortfolio = selectedPortfolioId
    ? assets.filter((h) => h.portfolio_id === selectedPortfolioId)
    : assets

  const visible = selectedTypes.size > 0
    ? byPortfolio.filter((h) => selectedTypes.has(h.asset_type as AssetType))
    : byPortfolio

  const allTypes = Array.from(new Set(byPortfolio.map((h) => h.asset_type))) as AssetType[]

  const priceItems = assets
    .filter((h) => h.symbol && PRICEABLE_TYPES.has(h.asset_type))
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices } = usePrices(priceItems)

  const { series, startPrices, avgCostPerAsset, quantityPerAsset, loading: histLoading, fxError, todayFx, startFx } =
    usePortfolioHistory(visible, period, selectedCurrency)

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

  const enriched = visible.map((h) => {
    const { price: rawPrice, source } = resolveAssetPrice(h, prices)
    const qty = quantityPerAsset[h.id] ?? 0
    const avgCost = avgCostPerAsset[h.id] ?? 0
    const priceCcy = source === 'live' ? 'USD' : h.currency
    const price = source === 'cost_basis' ? avgCost : rawPrice
    const value = qty * price * todayFx(priceCcy)
    const costBasis = qty * avgCost * todayFx(h.currency)
    const startPrice = h.symbol && source !== 'cost_basis' ? startPrices[h.symbol] : undefined
    const currentUnitValue = price * todayFx(priceCcy)
    const startUnitValue = startPrice !== undefined ? startPrice * startFx('USD') : undefined
    const changeAbs = startUnitValue !== undefined
      ? qty * (currentUnitValue - startUnitValue)
      : (source !== 'cost_basis' && costBasis > 0 ? value - costBasis : null)
    const changePct = startUnitValue !== undefined && startUnitValue > 0
      ? (currentUnitValue - startUnitValue) / startUnitValue * 100
      : (changeAbs !== null && costBasis > 0 ? changeAbs / costBasis * 100 : null)
    return { h, source, qty, avgCost, value, costBasis, changeAbs, changePct }
  })

  const sorted = [...enriched].sort((a, b) => {
    switch (sortBy) {
      case 'alpha':      return a.h.asset_name.localeCompare(b.h.asset_name)
      case 'value-desc': return b.value - a.value
      case 'value-asc':  return a.value - b.value
      case 'abs-gain':   return (b.changeAbs ?? 0) - (a.changeAbs ?? 0)
      case 'abs-loss':   return (a.changeAbs ?? 0) - (b.changeAbs ?? 0)
      case 'rel-gain':   return (b.changePct ?? 0) - (a.changePct ?? 0)
      case 'rel-loss':   return (a.changePct ?? 0) - (b.changePct ?? 0)
    }
  })

  const totalValue = enriched.reduce((sum, e) => sum + e.value, 0)
  const totalCostBasis = enriched.reduce((sum, e) => sum + e.costBasis, 0)
  const totalChangeAbs = totalValue - totalCostBasis
  const totalChangePct = totalCostBasis > 0 ? (totalChangeAbs / totalCostBasis) * 100 : null

  return (
    <div className="space-y-4">
      {fxError && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          {fxError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {allTypes.length > 1 && (
          <div className="order-first sm:order-2 w-full sm:w-auto flex items-center gap-2 flex-wrap">
            {allTypes.map((t) => {
              const active = selectedTypes.has(t)
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 active:opacity-70"
                  style={{
                    background: active ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-card)',
                    color: active ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
                    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {ASSET_TYPE_LABELS[t] ?? t}
                </button>
              )
            })}
          </div>
        )}

        <div className="order-2 sm:order-1">
          <PortfolioClient
            portfolios={portfolios}
            selectedId={selectedPortfolioId}
            onSelect={handlePortfolioSelect}
            userId={userId}
          />
        </div>

        <div className="ml-auto order-last">
          <button
            onClick={() => setShowAddAsset(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:opacity-75 transition-opacity"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Plus size={14} /> Add asset
          </button>
        </div>
      </div>

      <AssetsChart
        series={series}
        currency={selectedCurrency}
        loading={histLoading}
        period={period}
        onPeriodChange={setPeriod}
      />

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b gap-3"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
              {visible.length} asset{visible.length !== 1 ? 's' : ''}
            </span>

            {visible.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:opacity-80 active:opacity-60 transition-opacity"
                  style={{
                    color: sortBy !== 'value-desc' ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
                    background: sortBy !== 'value-desc' ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent',
                    border: `1px solid ${sortBy !== 'value-desc' ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)' : 'var(--color-border)'}`,
                  }}
                >
                  {SORT_LABELS[sortBy]}
                </button>

                {sortOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-xl py-1 min-w-40"
                    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                    onMouseLeave={() => setSortOpen(false)}
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setSortBy(key); setSortOpen(false) }}
                        className="w-full px-3 py-1.5 text-sm text-left transition-colors hover:opacity-80"
                        style={{
                          color: sortBy === key ? 'var(--color-accent)' : 'var(--color-foreground)',
                          background: sortBy === key ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                        }}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {visible.length > 0 && (
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">
                {hideAmounts ? '••••••' : histLoading ? '—' : formatCurrency(totalValue, selectedCurrency)}
              </p>
              {!hideAmounts && !histLoading && totalChangePct !== null && (
                <p className="text-xs tabular-nums" style={{ color: totalChangeAbs >= 0 ? '#22c55e' : '#ef4444' }}>
                  {totalChangeAbs >= 0 ? '+' : ''}{formatCurrency(totalChangeAbs, selectedCurrency)}
                  <span className="mx-1 opacity-50">·</span>
                  {formatPercent(totalChangePct)}
                </p>
              )}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {assets.length === 0
                ? 'No assets yet. Add your first position.'
                : 'No assets match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {sorted.map(({ h: asset, source, qty, avgCost, value, changeAbs, changePct }) => {
                  const isPositive = changeAbs !== null && changeAbs >= 0
                  const changeColor = isPositive ? '#22c55e' : '#ef4444'
                  return (
                    <tr
                      key={asset.id}
                      className="group transition-colors hover:bg-white/3"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td className="px-4 md:px-5 py-3.5 w-full">
                        <Link href={`/assets/${asset.id}`} className="block">
                          <p className="font-semibold text-sm leading-snug flex items-baseline gap-0">
                            <span>{asset.asset_name}</span>
                            <span className="mx-1.5 opacity-30 font-normal">·</span>
                            <span className="text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                              {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
                            </span>
                          </p>
                          {asset.symbol && (
                            <p className="text-xs mt-0.5 font-mono tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                              {asset.symbol}
                            </p>
                          )}
                          {!hideAmounts && (
                            <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                              {histLoading ? '…' : qty !== 1
                                ? <>{qty.toLocaleString('en-US', { maximumFractionDigits: 6 })}<span className="mx-1 opacity-40">·</span>{formatCurrency(avgCost, asset.currency)}</>
                                : formatCurrency(avgCost, asset.currency)
                              }
                            </p>
                          )}
                        </Link>
                      </td>

                      <td className="px-4 md:px-5 py-3.5 text-right whitespace-nowrap">
                        <p className="font-semibold text-sm tabular-nums">
                          {hideAmounts ? '••••••' : histLoading ? '—' : formatCurrency(value, selectedCurrency)}
                        </p>
                        {!hideAmounts && !histLoading && changeAbs !== null && changePct !== null ? (
                          <p className="text-xs mt-0.5 tabular-nums" style={{ color: changeColor }}>
                            {isPositive ? '+' : ''}{formatCurrency(changeAbs, selectedCurrency)}
                            <span className="mx-1 opacity-50">·</span>
                            {formatPercent(changePct)}
                          </p>
                        ) : source === 'manual' && asset.manual_price_date ? (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                            manual · {formatManualPriceAge(asset.manual_price_date)}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  )
}

function formatManualPriceAge(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
