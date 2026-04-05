'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ChevronDown, Check, Pencil } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, ASSET_TYPE_LABELS } from '@networth/utils'
import type { Portfolio, Holding, CurrencyCode, AssetType } from '@networth/types'
import { createClient } from '@/lib/supabase/client'
import { AddPortfolioDialog } from './add-portfolio-dialog'
import { AddHoldingDialog } from './add-holding-dialog'
import { EditHoldingDialog } from './edit-holding-dialog'

interface Props {
  portfolios: Portfolio[]
  holdings: Holding[]
  currency: CurrencyCode
  userId: string
}

export function PortfolioClient({ portfolios, holdings, currency, userId }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<AssetType>>(new Set())
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [showAddPortfolio, setShowAddPortfolio] = useState(false)
  const [showAddHolding, setShowAddHolding] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)

  async function handleDeleteHolding(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (!error) router.refresh()
  }

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

  const totalValue = visible.reduce(
    (sum, h) => sum + Number(h.quantity) * Number(h.average_cost_basis),
    0,
  )

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
      {/* ── Filters row ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-3">

        {/* Portfolio dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPortfolioOpen((o) => !o)}
            className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-lg text-sm font-medium"
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
                count={holdings.length}
                active={selectedPortfolioId === null}
                onClick={() => { setSelectedPortfolioId(null); setPortfolioOpen(false) }}
              />
              {portfolios.map((p) => (
                <DropdownOption
                  key={p.id}
                  label={p.name}
                  count={holdings.filter((h) => h.portfolio_id === p.id).length}
                  active={selectedPortfolioId === p.id}
                  onClick={() => { setSelectedPortfolioId(p.id); setSelectedTypes(new Set()); setPortfolioOpen(false) }}
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

        {/* Category multi-select chips */}
        {allTypes.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            {allTypes.map((t) => {
              const active = selectedTypes.has(t)
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: active
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : 'var(--color-card)',
                    color: active ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
                    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {active && <Check size={11} strokeWidth={3} />}
                  {ASSET_TYPE_LABELS[t] ?? t}
                </button>
              )
            })}
            {selectedTypes.size > 0 && (
              <button
                onClick={() => setSelectedTypes(new Set())}
                className="px-2 py-1.5 text-xs"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Spacer + Add holding */}
        <div className="ml-auto">
          <button
            onClick={() => setShowAddHolding(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Plus size={14} /> Add holding
          </button>
        </div>
      </div>

      {/* ── Holdings table ────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {/* Table header row */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
            {visible.length} holding{visible.length !== 1 ? 's' : ''}
            {selectedTypes.size > 0 && ` · ${Array.from(selectedTypes).map((t) => ASSET_TYPE_LABELS[t]).join(', ')}`}
          </span>
          {visible.length > 0 && (
            <span className="text-sm font-semibold">
              {hideAmounts ? '••••••' : formatCurrency(totalValue, currency)}
            </span>
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
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 md:px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Asset</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Type</th>
                  <th className="hidden lg:table-cell px-4 md:px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Portfolio</th>
                  <th className="hidden md:table-cell px-4 md:px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Quantity</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Avg Cost</th>
                  <th className="px-4 md:px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Value</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((holding) => {
                  const value = Number(holding.quantity) * Number(holding.average_cost_basis)
                  const portfolio = portfolios.find((p) => p.id === holding.portfolio_id)
                  return (
                    <tr
                      key={holding.id}
                      className="group transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td className="px-4 md:px-5 py-3">
                        <Link href={`/dashboard/portfolio/${holding.id}`} className="hover:underline">
                          <p className="font-semibold">{holding.symbol}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                            {holding.asset_name}
                          </p>
                        </Link>
                      </td>
                      <td className="hidden sm:table-cell px-4 md:px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                        >
                          {ASSET_TYPE_LABELS[holding.asset_type] ?? holding.asset_type}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 md:px-5 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {portfolio?.name ?? '—'}
                      </td>
                      <td className="hidden md:table-cell px-4 md:px-5 py-3 tabular-nums">
                        {Number(holding.quantity).toLocaleString('en-US', { maximumFractionDigits: 6 })}
                      </td>
                      <td className="hidden sm:table-cell px-4 md:px-5 py-3 tabular-nums">
                        {hideAmounts ? '••••' : formatCurrency(Number(holding.average_cost_basis), holding.currency)}
                      </td>
                      <td className="px-4 md:px-5 py-3 font-semibold tabular-nums">
                        {hideAmounts ? '••••••' : formatCurrency(value, currency)}
                      </td>
                      <td className="px-2 md:px-3 py-3">
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingHolding(holding)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--color-muted-foreground)' }}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteHolding(holding.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            style={{ color: '#ef4444' }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
      {showAddHolding && (
        <AddHoldingDialog
          portfolios={portfolios}
          userId={userId}
          onClose={() => setShowAddHolding(false)}
        />
      )}
      {editingHolding && (
        <EditHoldingDialog
          holding={editingHolding}
          portfolios={portfolios}
          onClose={() => setEditingHolding(null)}
        />
      )}
    </div>
  )
}

function DropdownOption({
  label,
  count,
  active,
  onClick,
  onDelete,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
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
        className="flex-1 flex items-center justify-between gap-3 px-3 py-1.5 text-sm"
        style={{ color: active ? 'var(--color-accent)' : 'var(--color-foreground)' }}
      >
        <span>{label}</span>
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{count}</span>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover/opt:opacity-100 p-1.5 mr-1 rounded transition-opacity"
          style={{ color: '#ef4444' }}
          title="Delete portfolio"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}
