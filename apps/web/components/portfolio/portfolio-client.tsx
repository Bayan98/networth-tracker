'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency } from '@networth/utils'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import type { Portfolio, Holding, CurrencyCode } from '@networth/types'
import { createClient } from '@/lib/supabase/client'
import { AddPortfolioDialog } from './add-portfolio-dialog'
import { AddHoldingDialog } from './add-holding-dialog'

interface Props {
  portfolios: Portfolio[]
  holdings: Holding[]
  currency: CurrencyCode
  userId: string
}

export function PortfolioClient({ portfolios, holdings, currency, userId }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(
    portfolios.find((p) => p.is_default)?.id ?? portfolios[0]?.id ?? null,
  )
  const [showAddPortfolio, setShowAddPortfolio] = useState(false)
  const [showAddHolding, setShowAddHolding] = useState(false)

  async function handleDeleteHolding(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId)
  const portfolioHoldings = holdings.filter((h) => h.portfolio_id === selectedPortfolioId)

  return (
    <div className="space-y-4">
      {/* Portfolio tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {portfolios.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPortfolioId(p.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: selectedPortfolioId === p.id ? 'var(--color-accent)' : 'var(--color-card)',
              color: selectedPortfolioId === p.id ? '#fff' : 'var(--color-muted-foreground)',
              border: '1px solid var(--color-border)',
            }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setShowAddPortfolio(true)}
          className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors"
          style={{
            background: 'var(--color-card)',
            color: 'var(--color-muted-foreground)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Plus size={14} /> New portfolio
        </button>
      </div>

      {/* Holdings table */}
      {selectedPortfolio ? (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div>
              <h2 className="text-sm font-semibold">{selectedPortfolio.name}</h2>
              {selectedPortfolio.description && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  {selectedPortfolio.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAddHolding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              <Plus size={14} /> Add holding
            </button>
          </div>

          {portfolioHoldings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                No holdings yet. Add your first position.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Asset', 'Type', 'Quantity', 'Avg Cost', 'Value', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-medium"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolioHoldings.map((holding) => {
                  const value = Number(holding.quantity) * Number(holding.average_cost_basis)
                  return (
                    <tr
                      key={holding.id}
                      className="hover:bg-white/5 transition-colors"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium">{holding.symbol}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {holding.asset_name}
                        </p>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                        {ASSET_TYPE_LABELS[holding.asset_type]}
                      </td>
                      <td className="px-5 py-3">{Number(holding.quantity).toFixed(4)}</td>
                      <td className="px-5 py-3">
                        {hideAmounts ? '••••' : formatCurrency(Number(holding.average_cost_basis), holding.currency)}
                      </td>
                      <td className="px-5 py-3 font-medium">
                        {hideAmounts ? '••••••' : formatCurrency(value, currency)}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDeleteHolding(holding.id)}
                          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: '#ef4444' }}
                          title="Delete holding"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Create a portfolio to get started.
          </p>
        </div>
      )}

      {showAddPortfolio && (
        <AddPortfolioDialog userId={userId} onClose={() => setShowAddPortfolio(false)} />
      )}
      {showAddHolding && selectedPortfolioId && (
        <AddHoldingDialog
          portfolioId={selectedPortfolioId}
          userId={userId}
          onClose={() => setShowAddHolding(false)}
        />
      )}
    </div>
  )
}
