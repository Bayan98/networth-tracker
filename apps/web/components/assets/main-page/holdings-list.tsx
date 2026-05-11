import { useMemo, useState } from 'react'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { formatPercent, ASSET_TYPE_LABELS } from '@networth/utils'
import type { CurrencyCode } from '@networth/types'
import type { AssetValuation } from '@/lib/hooks/use-portfolio-valuation'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { HoldingsSortMenu, type SortKey } from './holdings-sort-menu'

interface Props {
  assetsCount: number
  valuations: AssetValuation[]
  portfolioMap: Record<string, string>
  totalValue: number | null
  selectedCurrency: CurrencyCode
  loading: boolean
  onAssetClick: (assetId: string) => void
}

export function HoldingsList({
  assetsCount,
  valuations,
  portfolioMap,
  totalValue,
  selectedCurrency,
  loading,
  onAssetClick,
}: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('value-desc')
  const { displayPrice, displayQuantity, hideAmounts } = useAmountDisplay()
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

  return (
    <div className="table-wrap">
      <div className="table-head">
        <h3>Holdings</h3>
        {valuations.length > 1 && <HoldingsSortMenu sortBy={sortBy} onChange={setSortBy} />}
      </div>

      {valuations.length === 0 ? (
        <div style={{ padding: '36px 20px', textAlign: 'center' }}>
          <p className="empty-label">
            {assetsCount === 0 ? 'No assets yet. Add your first position.' : 'No assets match the selected filters.'}
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
                  onClick={() => onAssetClick(asset.id)}
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
                    {loading ? '…' : (
                      <>
                        {qty !== 1 && !hideAmounts && (
                          <span style={{ color: 'var(--ink-faint)', marginRight: 4 }}>
                            {displayQuantity(qty, { maximumFractionDigits: 4 })}
                            <span style={{ margin: '0 3px', opacity: 0.45 }}>|</span>
                          </span>
                        )}
                        {displayPrice(price, priceCcy)}
                      </>
                    )}
                  </td>
                  <td className="num">
                    {priceReturnAbs !== null && priceReturnPct !== null ? (
                      <span className={`delta-pill ${isPositive ? 'pos' : 'neg'}`}>
                        {formatPercent(priceReturnPct)}
                      </span>
                    ) : ''}
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {displayPrice(value, selectedCurrency, { loading, loadingText: '—' })}
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
  )
}
