import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { ASSET_TYPE_LABELS, formatPercent } from '@networth/utils'
import type { Asset, Portfolio, Transaction } from '@networth/types'
import type { AssetInfo } from '@/lib/hooks/use-asset-info'
import { LoadingText, MoneyText, QuantityText } from '@/components/ui/money-text'
import { getAssetTypeConfig } from '../asset-type-config'
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
  firstTx: Transaction | null
  lastTx: Transaction | null
  assetInfo: AssetInfo | null
}

export function AssetOverviewTab({
  asset, price, avgCostBasis, costBasis, marketValue, unrealized, unrealizedPct,
  quantity, source, portfolio, loading, firstTx, lastTx, assetInfo,
}: Props) {
  const assetConfig = getAssetTypeConfig(asset.asset_type)

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
          <StatRow k="Price" v={<MoneyText value={price} currency={asset.currency} loading={loading} />} />
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
          {assetInfo?.eps != null && <StatRow k="EPS" v={<MoneyText value={assetInfo.eps} currency={asset.currency} />} />}
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
          {assetConfig.transactions.showQuantity && <StatRow k="Quantity" v={<QuantityText value={quantity} loading={loading} />} />}
          <StatRow k="Avg cost" v={<MoneyText value={avgCostBasis > 0 ? avgCostBasis : null} currency={asset.currency} loading={loading} />} />
          <StatRow k="Total cost" v={<MoneyText value={costBasis > 0 ? costBasis : null} currency={asset.currency} loading={loading} maskLength={6} />} />
          <StatRow k="Market value" v={<MoneyText value={marketValue} currency={asset.currency} loading={loading} maskLength={6} />} />
          <StatRow
            k="Unrealized"
            v={<MoneyText value={unrealized} currency={asset.currency} loading={loading} withSign />}
            color={unrealized !== null ? (unrealized >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined}
          />
          <StatRow
            k="Return %"
            v={
              <LoadingText loading={loading} skelWidth={48}>
                {unrealizedPct !== null ? formatPercent(unrealizedPct) : '—'}
              </LoadingText>
            }
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

function StatRow({ k, v, color }: { k: string; v: ReactNode; color?: string }) {
  return (
    <div className="stat-row">
      <span className="stat-key">{k}</span>
      <span className="stat-val" style={color ? { color } : undefined}>{v}</span>
    </div>
  )
}
