import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Asset } from '@networth/types'
import type { AssetInfo } from '@/lib/hooks/use-asset-info'
import { LoadingText } from '@/components/ui/money-text'
import { AssetHoldingsTab } from './asset-holdings-tab'

interface Props {
  asset: Asset
  loading: boolean
  assetInfo: AssetInfo | null
}

export function AssetOverviewTab({
  asset, loading, assetInfo,
}: Props) {
  const yahooUrl = asset.symbol ? (() => {
    if (asset.asset_type === 'crypto') return `https://finance.yahoo.com/quote/${asset.symbol}-USD/`
    return assetInfo?.yahooUrl ?? null
  })() : null

  const stockAnalysisUrl = asset.symbol && asset.asset_type !== 'crypto' ? (() => {
    const colonIdx = asset.symbol.indexOf(':')
    if (colonIdx > 0) {
      const exchange = asset.symbol.slice(0, colonIdx).toLowerCase()
      const ticker = asset.symbol.slice(colonIdx + 1).toLowerCase()
      return `https://stockanalysis.com/quote/${exchange}/${ticker}/`
    }
    if (asset.asset_type === 'etf') return `https://stockanalysis.com/etf/${asset.symbol.toLowerCase()}/`
    return `https://stockanalysis.com/stocks/${asset.symbol.toLowerCase()}/`
  })() : null

  const analystColor = assetInfo?.analystRating
    ? assetInfo.analystRating.includes('Buy') ? 'var(--pos)'
      : assetInfo.analystRating.includes('Sell') ? 'var(--neg)'
      : 'var(--ink-2)'
    : undefined

  const providerLinks = (assetInfo?.sources ?? []).map((provider) => ({
    provider,
    href: provider === 'StockAnalysis' ? stockAnalysisUrl : provider === 'Yahoo' ? yahooUrl : null,
  }))
  const marketMetrics = [
    metric('Exchange', assetInfo?.exchange ?? null),
    metric('Currency', asset.currency),
    metric('P/E', assetInfo?.pe != null ? assetInfo.pe.toFixed(2) : null),
    metric('EPS', assetInfo?.eps != null ? assetInfo.eps.toFixed(2) : null),
    metric('Beta', assetInfo?.beta != null ? assetInfo.beta.toFixed(2) : null),
    metric('Dividend', assetInfo?.dividend ?? null),
    metric(
      'Analyst',
      assetInfo?.analystRating ? assetInfo.analystRating + (assetInfo.analystCount ? ` (${assetInfo.analystCount})` : '') : null,
      analystColor,
    ),
    metric('Price Target', assetInfo?.priceTarget != null ? formatCurrency(assetInfo.priceTarget, asset.currency) : null),
    providerLinks.length > 0
      ? metric('Source', <SourceLinks links={providerLinks} />)
      : null,
  ].filter((item): item is MetricItem => item !== null)
  const companyMetrics = [
    metric('Country', assetInfo?.country ?? null),
    metric('Website', assetInfo?.website ? <WebsiteLink href={assetInfo.website} /> : null),
    metric('Industry', assetInfo?.industry ?? null),
    metric('Sector', assetInfo?.sector ?? null),
    metric('Market Cap', assetInfo?.marketCap != null ? formatCurrency(assetInfo.marketCap, asset.currency, true) : null),
    metric('Employees', assetInfo?.employees != null ? formatCompactNumber(assetInfo.employees) : null),
    metric('About', <span className="overview-info-copy">{assetInfo?.description}</span>, undefined, 'wide', assetInfo?.description),
  ].filter((item): item is MetricItem => item !== null)

  return (
    <div className="overview-section-stack">
      <div className="overview-info-grid">
        {(loading || marketMetrics.length > 0) && (
          <OverviewGroup title="Market Data">
            {loading ? <OverviewLoadingMetrics count={6} /> : marketMetrics.map((item) => <OverviewMetric key={item.label} {...item} />)}
          </OverviewGroup>
        )}

        {(loading || companyMetrics.length > 0) && (
          <OverviewGroup title="Company Info">
            {loading ? <OverviewLoadingMetrics count={3} /> : companyMetrics.map((item) => <OverviewMetric key={item.label} {...item} />)}
          </OverviewGroup>
        )}
      </div>

      {assetInfo?.holdings && assetInfo.holdings.length > 0 && (
        <div className="overview-holdings">
          <AssetHoldingsTab holdings={assetInfo.holdings} title="Holdings" />
        </div>
      )}
    </div>
  )
}

function OverviewGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="empty-label" style={{ marginBottom: 18 }}>{title}</div>
      <div className="overview-info-list">{children}</div>
    </div>
  )
}

function OverviewMetric({ label, value, color, className }: MetricItem) {
  return (
    <div className={`overview-info-item ${className ?? ''}`}>
      {label && <div className="overview-info-label">{label}</div>}
      <div className="overview-info-value" style={color ? { color } : undefined}>{value}</div>
    </div>
  )
}

interface MetricItem {
  label: string
  value: ReactNode
  color?: string
  className?: string
}

function metric(label: string, value: ReactNode | null | undefined, color?: string, className?: string, rawValue: unknown = value): MetricItem | null {
  if (rawValue == null || rawValue === '') return null
  return { label, value, color, className }
}

function SourceLinks({ links }: { links: Array<{ provider: string; href: string | null }> }) {
  return (
    <span className="overview-source-links">
      {links.map((link, index) => (
        <span key={link.provider} className="overview-source-part">
          {index > 0 && <br />}
          {link.href ? (
            <a className="overview-info-link" href={link.href} target="_blank" rel="noopener noreferrer">
              {link.provider} <ExternalLink size={13} />
            </a>
          ) : (
            <span>{link.provider}</span>
          )}
        </span>
      ))}
    </span>
  )
}

function WebsiteLink({ href }: { href: string }) {
  let label = href
  try {
    label = new URL(href).hostname.replace(/^www\./, '')
  } catch {
    label = href.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  }

  return (
    <a className="overview-info-link" href={href} target="_blank" rel="noopener noreferrer">
      {label} <ExternalLink size={13} />
    </a>
  )
}

function formatCurrency(value: number, currency: string, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 2,
  }).format(value)
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

function OverviewLoadingMetrics({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <OverviewMetric key={index} label="" value={<LoadingValue />} />
      ))}
    </>
  )
}

function LoadingValue() {
  return (
    <LoadingText loading skelWidth={64}>
      {null}
    </LoadingText>
  )
}
