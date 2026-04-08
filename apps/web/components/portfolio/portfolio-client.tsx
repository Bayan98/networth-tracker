'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ChevronDown, Pencil, ArrowUpDown } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatPercent, ASSET_TYPE_LABELS, resolveHoldingPrice, PRICEABLE_TYPES } from '@networth/utils'
import type { Portfolio, Holding, CurrencyCode, AssetType } from '@networth/types'
import { createClient } from '@/lib/supabase/client'
import { usePrices } from '@/lib/hooks/use-prices'
import { usePortfolioHistory } from '@/lib/hooks/use-portfolio-history'
import { HoldingsChart } from './holdings-chart'
import { AddPortfolioDialog } from './add-portfolio-dialog'
import { EditPortfolioDialog } from './edit-portfolio-dialog'
import { AddHoldingDialog } from './add-holding-dialog'
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
  holdings: Holding[]
  currency: CurrencyCode
  userId: string
}

export function PortfolioClient({ portfolios, holdings, currency, userId }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const setSelectedCurrency = useAppStore((s) => s.setSelectedCurrency)

  const currencyInitRef = useRef(false)
  useEffect(() => {
    if (!currencyInitRef.current) {
      currencyInitRef.current = true
      if (selectedCurrency === 'USD' && currency !== 'USD') {
        setSelectedCurrency(currency)
      }
    }
  }, [])

  const priceItems = holdings
    .filter((h) => h.symbol && PRICEABLE_TYPES.has(h.asset_type))
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices } = usePrices(priceItems)

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<AssetType>>(new Set())
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('value-desc')
  const [period, setPeriod] = useState<Period>('1y')
  const [showAddPortfolio, setShowAddPortfolio] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null)
  const [showAddHolding, setShowAddHolding] = useState(false)

  async function handleDeletePortfolio(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('portfolios').delete().eq('id', id)
    if (!error) {
      if (selectedPortfolioId === id) setSelectedPortfolioId(null)
      router.refresh()
    }
  }

  const byPortfolio = selectedPortfolioId
    ? holdings.filter((h) => h.portfolio_id === selectedPortfolioId)
    : holdings

  const visible =
    selectedTypes.size > 0
      ? byPortfolio.filter((h) => selectedTypes.has(h.asset_type as AssetType))
      : byPortfolio

  const allTypes = Array.from(new Set(byPortfolio.map((h) => h.asset_type))) as AssetType[]

  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId)

  const { series, startPrices, avgCostPerHolding, loading: histLoading, todayFx, startFx } = usePortfolioHistory(visible, period, selectedCurrency)

  const enriched = visible.map((h) => {
    const { price: rawPrice, source } = resolveHoldingPrice(h, prices)
    const qty = Number(h.quantity)
    const avgCost = avgCostPerHolding[h.id] ?? Number(h.average_cost_basis)

    const priceCcy = source === 'live' ? 'USD' : h.currency
    const fxPrice = todayFx(priceCcy)
    const fxHolding = todayFx(h.currency)

    const price = source === 'cost_basis' ? avgCost : rawPrice

    const value = qty * price * fxPrice
    const costBasis = qty * avgCost * fxHolding

    const startPrice = h.symbol && source !== 'cost_basis' ? startPrices[h.symbol] : undefined
    const currentUnitValue = price * fxPrice
    const startUnitValue = startPrice !== undefined
      ? startPrice * startFx('USD')
      : undefined
    const changeAbs = startUnitValue !== undefined
      ? qty * (currentUnitValue - startUnitValue)
      : (source !== 'cost_basis' && costBasis > 0 ? value - costBasis : null)
    const changePct = startUnitValue !== undefined && startUnitValue > 0
      ? (currentUnitValue - startUnitValue) / startUnitValue * 100
      : (changeAbs !== null && costBasis > 0 ? changeAbs / costBasis * 100 : null)

    return { h, price, source, qty, avgCost, value, costBasis, changeAbs, changePct }
  })

  const sorted = [...enriched].sort((a, b) => {
    switch (sortBy) {
      case 'alpha':      return a.h.asset_name.localeCompare(b.h.asset_name)
      case 'value-desc': return b.value - a.value
      case 'value-asc':  return a.value - b.value
      case 'abs-gain': {
        if (a.changeAbs === null && b.changeAbs === null) return 0
        if (a.changeAbs === null) return 1
        if (b.changeAbs === null) return -1
        return b.changeAbs - a.changeAbs
      }
      case 'abs-loss': {
        if (a.changeAbs === null && b.changeAbs === null) return 0
        if (a.changeAbs === null) return 1
        if (b.changeAbs === null) return -1
        return a.changeAbs - b.changeAbs
      }
      case 'rel-gain': {
        if (a.changePct === null && b.changePct === null) return 0
        if (a.changePct === null) return 1
        if (b.changePct === null) return -1
        return b.changePct - a.changePct
      }
      case 'rel-loss': {
        if (a.changePct === null && b.changePct === null) return 0
        if (a.changePct === null) return 1
        if (b.changePct === null) return -1
        return a.changePct - b.changePct
      }
    }
  })

  const totalValue = enriched.reduce((sum, e) => sum + e.value, 0)
  const totalCostBasis = enriched.reduce((sum, e) => sum + e.costBasis, 0)
  const totalChangeAbs = totalValue - totalCostBasis
  const totalChangePct = totalCostBasis > 0 ? (totalChangeAbs / totalCostBasis) * 100 : null

  function toggleType(t: AssetType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  return (
    <div className="space-y-4">
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
                    background: active
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : 'var(--color-card)',
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

        <div className="relative order-2 sm:order-1">
          <button
            type="button"
            onClick={() => setPortfolioOpen((o) => !o)}
            className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-lg text-sm font-medium hover:opacity-80 active:opacity-70 transition-opacity"
            style={{
              background: selectedPortfolioId ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-card)',
              color: selectedPortfolioId ? 'var(--color-accent)' : 'var(--color-foreground)',
              border: `1px solid ${selectedPortfolioId ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            <span>{selectedPortfolio?.name ?? 'All portfolios'}</span>
            <ChevronDown
              size={13}
              className={`transition-transform ${portfolioOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--color-muted-foreground)' }}
            />
          </button>

          {portfolioOpen && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-xl py-1 min-w-[180px]"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              onMouseLeave={() => setPortfolioOpen(false)}
            >
              <DropdownOption
                label="All portfolios"
                active={selectedPortfolioId === null}
                onClick={() => { setSelectedPortfolioId(null); setPortfolioOpen(false) }}
              />
              {portfolios.map((p) => (
                <DropdownOption
                  key={p.id}
                  label={p.name}
                  active={selectedPortfolioId === p.id}
                  onClick={() => { setSelectedPortfolioId(p.id); setSelectedTypes(new Set()); setPortfolioOpen(false) }}
                  onEdit={() => { setEditingPortfolio(p); setPortfolioOpen(false) }}
                  onDelete={() => handleDeletePortfolio(p.id)}
                />
              ))}
              <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />
              <button
                onClick={() => { setShowAddPortfolio(true); setPortfolioOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                <Plus size={13} /> New portfolio
              </button>
            </div>
          )}
        </div>

        <div className="ml-auto order-last">
          <button
            onClick={() => setShowAddHolding(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:opacity-75 transition-opacity"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Plus size={14} /> Add holding
          </button>
        </div>
      </div>

      <HoldingsChart
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
              {visible.length} holding{visible.length !== 1 ? 's' : ''}
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
                  <ArrowUpDown size={11} />
                  <span>{SORT_LABELS[sortBy]}</span>
                </button>

                {sortOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-xl py-1 min-w-[160px]"
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
              {holdings.length === 0
                ? 'No holdings yet. Add your first position.'
                : 'No holdings match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {sorted.map(({ h: holding, source, qty, avgCost, value, changeAbs, changePct }) => {
                  const isPositive = changeAbs !== null && changeAbs >= 0
                  const changeColor = isPositive ? '#22c55e' : '#ef4444'

                  return (
                    <tr
                      key={holding.id}
                      className="group transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td className="px-4 md:px-5 py-3.5 w-full">
                        <Link href={`/holdings/${holding.id}`} className="block">
                          <p className="font-semibold text-sm leading-snug flex items-baseline gap-0">
                            <span>{holding.asset_name}</span>
                            <span className="mx-1.5 opacity-30 font-normal">·</span>
                            <span className="text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                              {ASSET_TYPE_LABELS[holding.asset_type] ?? holding.asset_type}
                            </span>
                          </p>
                          {holding.symbol && (
                            <p className="text-xs mt-0.5 font-mono tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                              {holding.symbol}
                            </p>
                          )}
                          {!hideAmounts && (
                            <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                              {histLoading ? '…' : qty !== 1
                                ? <>{qty.toLocaleString('en-US', { maximumFractionDigits: 6 })}<span className="mx-1 opacity-40">·</span>{formatCurrency(avgCost, holding.currency)}</>
                                : formatCurrency(avgCost, holding.currency)
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
                        ) : source === 'manual' && holding.manual_price_date ? (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                            manual · {formatManualPriceAge(holding.manual_price_date)}
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

      {showAddPortfolio && (
        <AddPortfolioDialog userId={userId} onClose={() => setShowAddPortfolio(false)} />
      )}
      {editingPortfolio && (
        <EditPortfolioDialog portfolio={editingPortfolio} onClose={() => setEditingPortfolio(null)} />
      )}
      {showAddHolding && (
        <AddHoldingDialog
          portfolios={portfolios}
          userId={userId}
          defaultPortfolioId={selectedPortfolioId}
          onClose={() => setShowAddHolding(false)}
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

function DropdownOption({
  label,
  active,
  onClick,
  onEdit,
  onDelete,
}: {
  label: string
  active: boolean
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className="group/opt flex items-center transition-colors"
      style={{ background: active ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : undefined }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-muted)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = ''
      }}
    >
      <button
        onClick={onClick}
        className="flex-1 px-3 py-1.5 text-sm text-left"
        style={{ color: active ? 'var(--color-accent)' : 'var(--color-foreground)' }}
      >
        {label}
      </button>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/opt:opacity-100 pr-1 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--color-muted-foreground)' }}
              title="Edit portfolio"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: '#ef4444' }}
              title="Delete portfolio"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
