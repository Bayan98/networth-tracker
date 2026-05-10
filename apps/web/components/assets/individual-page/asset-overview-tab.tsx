import { ExternalLink } from 'lucide-react'
import { ASSET_TYPE_LABELS, formatCurrency, formatPercent } from '@networth/utils'
import type { Asset, Portfolio, Transaction } from '@networth/types'
import type { AssetInfo } from '@/lib/hooks/use-asset-info'
import { fmtDate } from './asset-detail-utils'

interface Props {
  asset: Asset
  price: number | null
  avgCostBasis: number
  costBasis: number
  marketValue: number | null
  unrealized: number | null
  unrealizedPct: number | null
  quantity: number
  source: string
  portfolio: Portfolio | undefined
  loading: boolean
  hideAmounts: boolean
  firstTx: Transaction | null
  lastTx: Transaction | null
  assetInfo: AssetInfo | null
}

export function AssetOverviewTab({
  asset, price, avgCostBasis, costBasis, marketValue, unrealized, unrealizedPct,
  quantity, source, portfolio, loading, hideAmounts, firstTx, lastTx, assetInfo,
}: Props) {
  const priceUrl = source === 'live' && asset.symbol ? (() => {
    if (asset.asset_type === 'crypto') return `https://finance.yahoo.com/quote/${asset.symbol}-USD/`
    const colonIdx = asset.symbol.indexOf(':')
    if (colonIdx > 0) {
      const exchange = asset.symbol.slice(0, colonIdx).toLowerCase()
      const ticker = asset.symbol.slice(colonIdx + 1).toLowerCase()
      return `https://stockanalysis.com/quote/${exchange}/${ticker}/`
    }
    if (asset.asset_type === 'etf') return `https://stockanalysis.com/etf/${asset.symbol.toLowerCase()}/`
    return `https://finance.yahoo.com/quote/${asset.symbol}/`
  })() : null

  const analystColor = assetInfo?.analystRating
    ? assetInfo.analystRating.includes('Buy') ? 'var(--pos)'
      : assetInfo.analystRating.includes('Sell') ? 'var(--neg)'
      : 'var(--ink-2)'
    : undefined

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="overview-cols">
      <div>
        <div className="empty-label" style={{ marginBottom: 12 }}>Market</div>
        <div>
          <StatRow k="Symbol" v={asset.symbol ?? '—'} />
          <StatRow k="Price" v={hideAmounts ? '•••' : loading ? '…' : price !== null ? formatCurrency(price, asset.currency) : '—'} />
          {source === 'live' && priceUrl ? (
            <div className="stat-row">
              <span className="stat-key">Source</span>
              <a href={priceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                Live price <ExternalLink size={11} />
              </a>
            </div>
          ) : (
            <StatRow k="Source" v={source === 'manual' ? 'Manual' : 'Est. from cost'} />
          )}
          <StatRow k="Currency" v={asset.currency} />
          <StatRow k="Type" v={ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type} />
          <StatRow k="Portfolio" v={portfolio?.name ?? 'Unassigned'} />
          {assetInfo?.sector && <StatRow k="Sector" v={assetInfo.sector} />}
          {assetInfo?.country && <StatRow k="Country" v={assetInfo.country} />}
          {assetInfo?.pe != null && <StatRow k="P/E" v={assetInfo.pe.toFixed(1) + 'x'} />}
          {assetInfo?.eps != null && <StatRow k="EPS" v={formatCurrency(assetInfo.eps, asset.currency)} />}
          {assetInfo?.beta != null && <StatRow k="Beta" v={assetInfo.beta.toFixed(2)} />}
          {assetInfo?.dividend && <StatRow k="Dividend" v={assetInfo.dividend} />}
          {assetInfo?.analystRating && (
            <StatRow
              k="Analyst"
              v={assetInfo.analystRating + (assetInfo.analystCount ? ` (${assetInfo.analystCount})` : '')}
              color={analystColor}
            />
          )}
          {assetInfo?.description && (
            <div className="stat-row" style={{ alignItems: 'flex-start' }}>
              <span className="stat-key">About</span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 320 }}>{assetInfo.description}</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="empty-label" style={{ marginBottom: 12 }}>Position</div>
        <div>
          <StatRow k="Quantity" v={hideAmounts ? '••••' : loading ? '…' : quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} />
          <StatRow k="Avg cost" v={hideAmounts ? '•••' : loading ? '…' : avgCostBasis > 0 ? formatCurrency(avgCostBasis, asset.currency) : '—'} />
          <StatRow k="Total cost" v={hideAmounts ? '••••••' : loading ? '…' : costBasis > 0 ? formatCurrency(costBasis, asset.currency) : '—'} />
          <StatRow k="Market value" v={hideAmounts ? '••••••' : loading ? '…' : marketValue !== null ? formatCurrency(marketValue, asset.currency) : '—'} />
          <StatRow
            k="Unrealized"
            v={hideAmounts ? '•••' : loading ? '…' : unrealized !== null ? (unrealized >= 0 ? '+' : '') + formatCurrency(unrealized, asset.currency) : '—'}
            color={unrealized !== null ? (unrealized >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined}
          />
          <StatRow k="Return %" v={hideAmounts ? '•••' : loading ? '…' : unrealizedPct !== null ? formatPercent(unrealizedPct) : '—'}
            color={unrealizedPct !== null ? (unrealizedPct >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined}
          />
          <StatRow k="First bought" v={firstTx ? fmtDate(firstTx.executed_at) : '—'} />
          <StatRow k="Last activity" v={lastTx ? fmtDate(lastTx.executed_at) : '—'} />
        </div>
      </div>
      <style>{`@media (max-width: 640px) { .overview-cols { grid-template-columns: 1fr !important; gap: 24px !important; } }`}</style>
    </div>
  )
}

function StatRow({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="stat-row">
      <span className="stat-key">{k}</span>
      <span className="stat-val" style={color ? { color } : undefined}>{v}</span>
    </div>
  )
}
