'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { formatCurrency, ASSET_TYPE_LABELS, resolveAssetPrice, PRICEABLE_TYPES } from '@networth/utils'
import { usePrices } from '@/lib/hooks/use-prices'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import { usePortfolioHistory } from '@/lib/hooks/use-portfolio-history'
import { AssetsChart } from '@/components/assets/assets-chart'
import type { Asset, Portfolio, Debt, CurrencyCode } from '@networth/types'
import type { Period } from '@/components/ui/area-chart'

const ASSET_TYPE_COLOR: Record<string, string> = {
  stock: 'var(--cat-stocks)',
  etf: 'var(--cat-stocks)',
  mutual_fund: 'var(--cat-stocks)',
  bond: 'var(--cat-stocks)',
  crypto: 'var(--cat-crypto)',
  cash: 'var(--cat-cash)',
  deposit: 'var(--cat-cash)',
  real_estate: 'var(--cat-real)',
  commodity: 'var(--cat-other)',
  transport: 'var(--cat-other)',
  business: 'var(--cat-other)',
  other: 'var(--cat-other)',
}

const PALETTE = [
  'var(--cat-stocks)',
  'var(--cat-crypto)',
  'var(--cat-cash)',
  'var(--cat-real)',
  'var(--cat-other)',
  'oklch(55% 0.12 310)',
  'oklch(52% 0.11 200)',
  'oklch(58% 0.09 40)',
]

interface Enriched {
  asset: Asset
  value: number | null
}

interface Props {
  assets: Asset[]
  portfolios: Portfolio[]
  debts: Debt[]
  quantityPerAsset: Record<string, number>
  currency: CurrencyCode
}

// SVG donut matching the design file's Donut component exactly
function Donut({ segments, size = 160, thickness = 10, center }: {
  segments: { color: string; value: number; label: string }[]
  size?: number
  thickness?: number
  center?: React.ReactNode
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) return null

  const r = (size - thickness) / 2
  const c = size / 2
  let offset = -Math.PI / 2
  const gap = segments.length > 1 ? 0.012 : 0

  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * Math.PI * 2
    const start = offset
    const end = offset + angle
    offset = end
    const sx1 = c + Math.cos(start + gap) * r
    const sy1 = c + Math.sin(start + gap) * r
    const sx2 = c + Math.cos(end - gap) * r
    const sy2 = c + Math.sin(end - gap) * r
    const large = angle > Math.PI ? 1 : 0
    return {
      d: `M ${sx1} ${sy1} A ${r} ${r} 0 ${large} 1 ${sx2} ${sy2}`,
      color: seg.color,
      pct: (seg.value / total) * 100,
      label: seg.label,
    }
  })

  const hoveredSeg = hovered !== null ? arcs[hovered] : null

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {arcs.map((a, i) => (
          <path
            key={i}
            d={a.d}
            fill="none"
            stroke={a.color}
            strokeWidth={hovered === i ? thickness + 3 : thickness}
            strokeLinecap="butt"
            style={{ cursor: 'pointer', transition: 'stroke-width .12s' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        {hoveredSeg ? (
          <>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 500, letterSpacing: '0.02em', maxWidth: r * 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hoveredSeg.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', marginTop: 2, color: hoveredSeg.color }}>
              {hoveredSeg.pct.toFixed(1)}%
            </div>
          </>
        ) : center}
      </div>
    </div>
  )
}

export function DashboardClient({ assets, portfolios, debts, quantityPerAsset, currency }: Props) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  const _hideAmounts = useAppStore((s) => s.hideAmounts)
  const _selectedCurrency = useAppStore((s) => s.selectedCurrency)
  // Use server-consistent values until mounted to avoid SSR/client hydration mismatch
  // (Zustand persist loads localStorage on client but server always uses defaults)
  const hideAmounts = isMounted ? _hideAmounts : false
  const selectedCurrency = isMounted ? _selectedCurrency : currency

  const [period, setPeriod] = useState<Period>('1y')

  const priceItems = assets
    .filter((h) => h.symbol && PRICEABLE_TYPES.has(h.asset_type))
    .map((h) => ({ symbol: h.symbol!, asset_type: h.asset_type }))
  const { prices } = usePrices(priceItems)
  const { fx } = useTodayFx(assets, selectedCurrency)

  const { series, loading: histLoading, avgCostPerAsset, quantityPerAsset: hookQty } = usePortfolioHistory(assets, period, selectedCurrency)

  const enriched: Enriched[] = assets.map((asset) => {
    const { price: rawPrice, source } = resolveAssetPrice(asset, prices)
    // For assets with no transactions, default qty to 1 (e.g. real estate, manual assets)
    const serverQty = quantityPerAsset[asset.id]
    const hookAssetQty = hookQty[asset.id]
    const qty = serverQty !== undefined ? serverQty : (hookAssetQty !== undefined ? hookAssetQty : 1)
    // For non-live assets with no manual price, fall back to avg cost from transactions (in asset currency)
    const price = source === 'cost_basis' ? (avgCostPerAsset[asset.id] ?? 0) : rawPrice
    const priceCcy = source === 'live' ? 'USD' : asset.currency
    const rate = fx(priceCcy)
    const value: number | null = rate !== null && price > 0 ? qty * price * rate : null
    return { asset, value }
  })

  const totalValue = enriched.reduce<number | null>(
    (sum, e) => (sum !== null && e.value !== null ? sum + e.value : null),
    0,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <AssetsChart
        series={series}
        currency={selectedCurrency}
        loading={histLoading}
        period={period}
        onPeriodChange={setPeriod}
        totalValue={totalValue}
        hideAmounts={hideAmounts}
      />

      <div className="three-col">
        <AllocationByCategory enriched={enriched} totalValue={totalValue} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} />
        <AllocationByPortfolio enriched={enriched} portfolios={portfolios} totalValue={totalValue} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} />
        <AllocationByCurrency enriched={enriched} totalValue={totalValue} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} />
      </div>

      <div className="bottom-row">
        <TopPositions enriched={enriched} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} onAssetClick={(id) => router.push(`/assets/${id}`)} />
        <AllocationByAssets enriched={enriched} totalValue={totalValue} hideAmounts={hideAmounts} selectedCurrency={selectedCurrency} onAssetClick={(id) => router.push(`/assets/${id}`)} />
      </div>
    </div>
  )
}

// ─── Allocation by category ───────────────────────────────────────────────────

function AllocationByCategory({ enriched, totalValue, hideAmounts, selectedCurrency }: {
  enriched: Enriched[]
  totalValue: number | null
  hideAmounts: boolean
  selectedCurrency: CurrencyCode
}) {
  const byType = new Map<string, number>()
  for (const { asset, value } of enriched) {
    if (value === null) continue
    byType.set(asset.asset_type, (byType.get(asset.asset_type) ?? 0) + value)
  }
  const data = Array.from(byType.entries())
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      type, label: ASSET_TYPE_LABELS[type] ?? type,
      value, color: ASSET_TYPE_COLOR[type] ?? 'var(--cat-other)',
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <AllocationCard
      title="By category"
      sub={`${data.length} class${data.length !== 1 ? 'es' : ''}`}
      data={data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }))}
      total={total}
      hideAmounts={hideAmounts}
      selectedCurrency={selectedCurrency}
    />
  )
}

// ─── Allocation by portfolio ──────────────────────────────────────────────────

function AllocationByPortfolio({ enriched, portfolios, totalValue, hideAmounts, selectedCurrency }: {
  enriched: Enriched[]
  portfolios: Portfolio[]
  totalValue: number | null
  hideAmounts: boolean
  selectedCurrency: CurrencyCode
}) {
  const byPortfolio = new Map<string, number>()
  for (const { asset, value } of enriched) {
    if (value === null) continue
    const key = asset.portfolio_id ?? '__none__'
    byPortfolio.set(key, (byPortfolio.get(key) ?? 0) + value)
  }

  const data = Array.from(byPortfolio.entries())
    .filter(([, v]) => v > 0)
    .map(([id, value], i) => ({
      type: id,
      label: portfolios.find((p) => p.id === id)?.name ?? 'Unassigned',
      value,
      color: PALETTE[i % PALETTE.length],
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <AllocationCard
      title="By portfolio"
      sub={`${data.length} portfolio${data.length !== 1 ? 's' : ''}`}
      data={data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }))}
      total={total}
      hideAmounts={hideAmounts}
      selectedCurrency={selectedCurrency}
    />
  )
}

// ─── Allocation by currency ───────────────────────────────────────────────────

function AllocationByCurrency({ enriched, totalValue, hideAmounts, selectedCurrency }: {
  enriched: Enriched[]
  totalValue: number | null
  hideAmounts: boolean
  selectedCurrency: CurrencyCode
}) {
  const byCurrency = new Map<string, number>()
  for (const { asset, value } of enriched) {
    if (value === null) continue
    byCurrency.set(asset.currency, (byCurrency.get(asset.currency) ?? 0) + value)
  }

  const data = Array.from(byCurrency.entries())
    .filter(([, v]) => v > 0)
    .map(([ccy, value], i) => ({
      type: ccy, label: ccy, value,
      color: PALETTE[i % PALETTE.length],
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <AllocationCard
      title="By currency"
      sub={`${data.length} currenc${data.length !== 1 ? 'ies' : 'y'}`}
      data={data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }))}
      total={total}
      hideAmounts={hideAmounts}
      selectedCurrency={selectedCurrency}
    />
  )
}

// ─── Shared allocation card ───────────────────────────────────────────────────

function AllocationCard({ title, sub, data, total, hideAmounts, selectedCurrency }: {
  title: string
  sub: string
  data: { type: string; label: string; value: number; color: string; pct: number }[]
  total: number
  hideAmounts: boolean
  selectedCurrency: CurrencyCode
}) {
  if (data.length === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <h3>{title}</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No data yet.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
        <span className="sub">{sub}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
        <Donut
          segments={data.map((d) => ({ color: d.color, value: d.value, label: d.label }))}
          center={
            <>
              <div className="empty-label">Total</div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em', marginTop: 3 }}>
                {hideAmounts ? '•••' : formatCurrency(total, selectedCurrency)}
              </div>
            </>
          }
        />
      </div>

      <div className="alloc-list">
        {data.map((d) => (
          <div key={d.type} className="alloc-row">
            <div className="swatch" style={{ background: d.color }} />
            <div className="alloc-name">{d.label}</div>
            <div className="alloc-pct">{d.pct.toFixed(1)}%</div>
            <div className="alloc-bar">
              <span style={{ width: `${d.pct}%`, background: d.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Top positions ────────────────────────────────────────────────────────────

function TopPositions({ enriched, hideAmounts, selectedCurrency, onAssetClick }: {
  enriched: Enriched[]
  hideAmounts: boolean
  selectedCurrency: CurrencyCode
  onAssetClick: (id: string) => void
}) {
  const sorted = [...enriched]
    .filter((e) => e.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8)

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Top positions</h3>
          <div className="sub">Sorted by value</div>
        </div>
        <Link href="/assets" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          View all →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sorted.map(({ asset, value }) => {
          const color = ASSET_TYPE_COLOR[asset.asset_type] ?? 'var(--cat-other)'
          return (
            <div
              key={asset.id}
              onClick={() => onAssetClick(asset.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr auto',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'opacity .1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                color, flexShrink: 0,
              }}>
                {(asset.symbol ?? asset.asset_name).slice(0, 4).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {asset.asset_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                  {asset.symbol ?? ASSET_TYPE_LABELS[asset.asset_type]}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {hideAmounts ? '•••' : value !== null ? formatCurrency(value, selectedCurrency) : '—'}
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', padding: '16px 0' }}>No assets yet.</p>
        )}
      </div>
    </div>
  )
}

// ─── Allocation by individual assets ─────────────────────────────────────────

function AllocationByAssets({ enriched, totalValue, hideAmounts, selectedCurrency, onAssetClick }: {
  enriched: Enriched[]
  totalValue: number | null
  hideAmounts: boolean
  selectedCurrency: CurrencyCode
  onAssetClick: (id: string) => void
}) {
  const sorted = [...enriched]
    .filter((e) => e.value !== null && (e.value ?? 0) > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  const total = sorted.reduce((s, e) => s + (e.value ?? 0), 0)

  const top8 = sorted.slice(0, 8)
  const othersValue = sorted.slice(8).reduce((s, e) => s + (e.value ?? 0), 0)

  const segments = [
    ...top8.map((e) => ({
      color: ASSET_TYPE_COLOR[e.asset.asset_type] ?? 'var(--cat-other)',
      value: e.value ?? 0,
      label: e.asset.symbol ?? e.asset.asset_name,
    })),
    ...(othersValue > 0 ? [{ color: 'var(--border-strong)', value: othersValue, label: 'Others' }] : []),
  ]

  return (
    <div className="card">
      <div className="card-head">
        <h3>Asset share</h3>
        <span className="sub">{sorted.length} positions</span>
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No assets yet.</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
            <Donut segments={segments} />
          </div>

          <div className="alloc-list">
            {sorted.slice(0, 6).map(({ asset, value }) => {
              const pct = total > 0 && value !== null ? (value / total) * 100 : 0
              const color = ASSET_TYPE_COLOR[asset.asset_type] ?? 'var(--cat-other)'
              return (
                <div
                  key={asset.id}
                  className="alloc-row"
                  onClick={() => onAssetClick(asset.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="swatch" style={{ background: color }} />
                  <div className="alloc-name">{asset.symbol ?? asset.asset_name}</div>
                  <div className="alloc-pct">{pct.toFixed(1)}%</div>
                  <div className="alloc-bar">
                    <span style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
