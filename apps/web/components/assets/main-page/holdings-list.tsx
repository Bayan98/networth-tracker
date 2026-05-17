import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Plus } from 'lucide-react'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { formatPercent, ASSET_TYPE_LABELS } from '@networth/utils'
import type { CurrencyCode } from '@networth/types'
import type { AssetValuation } from '@/lib/hooks/use-portfolio-valuation'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { MoneyText, QuantityText } from '@/components/ui/money-text'
import { SkeletonTableRows } from '@/components/ui/skeleton'
import { Swatch, type RowTone } from '@/components/ui/tone-badge'
import { HoldingsSortMenu, type SortKey } from './holdings-sort-menu'

const SORT_LABELS: Record<SortKey, string> = {
  'alpha':      'name',
  'value-desc': 'value',
  'value-asc':  'value · ascending',
  'abs-gain':   'absolute gain',
  'abs-loss':   'absolute loss',
  'rel-gain':   'relative gain',
  'rel-loss':   'relative loss',
}

function priceReturnTone(pct: number | null): RowTone {
  if (pct === null) return 'neutral'
  return pct >= 0 ? 'pos' : 'neg'
}

interface Props {
  assetsCount: number
  valuations: AssetValuation[]
  portfolioMap: Record<string, string>
  totalValue: number | null
  selectedCurrency: CurrencyCode
  loading: boolean
  onAssetClick: (assetId: string) => void
  onAddAsset?: () => void
}

export function HoldingsList({
  assetsCount,
  valuations,
  portfolioMap,
  totalValue,
  selectedCurrency,
  loading,
  onAssetClick,
  onAddAsset,
}: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('value-desc')
  const { hideAmounts } = useAmountDisplay()
  const sorted = useMemo(() => [...valuations].sort((a, b) => {
    switch (sortBy) {
      case 'alpha':      return a.asset.asset_name.localeCompare(b.asset.asset_name)
      case 'value-desc': return (b.value ?? 0) - (a.value ?? 0)
      case 'value-asc':  return (a.value ?? 0) - (b.value ?? 0)
      case 'abs-gain':   return (b.priceReturnAbs ?? 0) - (a.priceReturnAbs ?? 0)
      case 'abs-loss':   return (a.priceReturnAbs ?? 0) - (b.priceReturnAbs ?? 0)
      case 'rel-gain':   return (b.priceReturnPct ?? 0) - (a.priceReturnPct ?? 0)
      case 'rel-loss':   return (a.priceReturnPct ?? 0) - (b.priceReturnPct ?? 0)
    }
  }), [sortBy, valuations])

  const isFirstRunEmpty = !loading && assetsCount === 0

  if (isFirstRunEmpty) {
    return (
      <div className="card empty-state">
        <div className="empty-state-icon">
          <Sparkles size={20} />
        </div>
        <div className="empty-state-text">
          <h2>No assets yet</h2>
          <p>
            Add a position — stocks, crypto, real estate, or cash — to start
            tracking value, cost basis, and performance.
          </p>
        </div>
        {onAddAsset && (
          <button className="btn btn-primary" onClick={onAddAsset} style={{ marginTop: 6 }}>
            <Plus size={14} /> Add first asset
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <div className="ds-positions-head" style={{ flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h3>Holdings <em>register</em></h3>
          <p className="ds-positions-meta" style={{ margin: '6px 0 0' }}>
            {valuations.length} of {assetsCount} · sorted by {SORT_LABELS[sortBy]}
          </p>
        </div>
        {valuations.length > 1 && <HoldingsSortMenu sortBy={sortBy} onChange={setSortBy} />}
      </div>

      {loading && valuations.length === 0 ? (
        <SkeletonTableRows rows={6} />
      ) : valuations.length === 0 ? (
        <div style={{ padding: '36px 20px', textAlign: 'center' }}>
          <p className="empty-label" style={{ margin: 0 }}>
            No assets match the selected filters.
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
              const tone = priceReturnTone(priceReturnPct)
              return (
                <tr
                  key={asset.id}
                  onClick={() => onAssetClick(asset.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <Link
                      href={`/assets/${asset.id}`}
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        gap: 10,
                        color: 'inherit',
                        textDecoration: 'none',
                        minHeight: 32,
                      }}
                    >
                      <Swatch tone={tone} />
                      <AssetAvatar
                        symbol={asset.symbol}
                        assetType={asset.asset_type}
                        name={asset.asset_name}
                        size={32}
                        borderRadius={8}
                      />
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 2,
                        minWidth: 0,
                      }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {asset.symbol ?? asset.asset_name}
                          {asset.symbol && (
                            <span style={{ fontWeight: 400, color: 'var(--ink-muted)', marginLeft: 6, fontSize: 12 }}>
                              {asset.asset_name}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: 'var(--ink-faint)',
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '-0.005em',
                        }}>
                          {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td data-label="Portfolio" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                    {portfolio ?? ''}
                  </td>
                  <td data-label="Price" className="num" style={{ fontSize: 12 }}>
                    {qty !== 1 && !hideAmounts && (
                      <span style={{ color: 'var(--ink-faint)', marginRight: 4 }}>
                        <QuantityText value={qty} loading={loading} maximumFractionDigits={4} />
                        <span style={{ margin: '0 3px', opacity: 0.45 }}>|</span>
                      </span>
                    )}
                    <MoneyText value={price} currency={priceCcy} loading={loading} skelWidth={60} />
                  </td>
                  <td data-label="Change" className="num">
                    {priceReturnAbs !== null && priceReturnPct !== null ? (
                      <span className={`delta-pill ${isPositive ? 'pos' : 'neg'}`}>
                        {formatPercent(priceReturnPct)}
                      </span>
                    ) : ''}
                  </td>
                  <td data-label="Value" className="num" style={{ fontWeight: 600 }}>
                    <MoneyText value={value} currency={selectedCurrency} loading={loading} skelWidth={70} />
                  </td>
                  <td data-label="Share" className="num" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                    {share !== null ? `${share.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
