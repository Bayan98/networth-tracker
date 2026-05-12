'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { Donut } from '@/components/ui/donut'
import {
  ASSET_TYPE_COLOR,
  PALETTE,
  ASSET_TYPE_LIQUIDITY,
  LIQUIDITY_COLOR,
  ASSET_TYPE_SECTOR,
  SECTOR_COLOR,
  CURRENCY_COUNTRY,
} from '@/lib/colors'
import type { Asset, Portfolio, CurrencyCode } from '@networth/types'

export interface Enriched {
  asset: Asset
  value: number | null
}

export type AllocationType =
  | 'category'
  | 'portfolio'
  | 'currency'
  | 'assets'
  | 'liquidity'
  | 'country'
  | 'sector'

const ALLOC_LABELS: Record<AllocationType, string> = {
  category:  'Category allocation',
  portfolio: 'Portfolio allocation',
  currency:  'Currency allocation',
  assets:    'Asset share',
  liquidity: 'Liquidity allocation',
  country:   'Country allocation',
  sector:    'Sector allocation',
}

const MIN_VISIBLE_ITEMS = 5
const FALLBACK_ALLOC_ROW_HEIGHT = 22
const FALLBACK_ALLOC_BUTTON_HEIGHT = 34

interface AllocItem {
  key: string
  label: string
  value: number
  color: string
}

function buildItems(enriched: Enriched[], portfolios: Portfolio[], type: AllocationType): AllocItem[] {
  if (type === 'assets') {
    return enriched
      .filter((e) => e.value !== null && e.value > 0)
      .map((e) => ({
        key: e.asset.id,
        label: e.asset.symbol ?? e.asset.asset_name,
        value: e.value!,
        color: ASSET_TYPE_COLOR[e.asset.asset_type] ?? 'var(--cat-other)',
      }))
      .sort((a, b) => b.value - a.value)
  }

  const map = new Map<string, { label: string; value: number; color: string }>()

  for (const { asset, value } of enriched) {
    if (value === null || value <= 0) continue

    let key: string
    let label: string
    let color: string

    switch (type) {
      case 'category':
        key = asset.asset_type
        label = ASSET_TYPE_LABELS[key] ?? key
        color = ASSET_TYPE_COLOR[key] ?? 'var(--cat-other)'
        break
      case 'portfolio':
        key = asset.portfolio_id ?? '__none__'
        label = portfolios.find((p) => p.id === key)?.name ?? 'Unassigned'
        color = ''
        break
      case 'currency':
        key = asset.currency
        label = asset.currency
        color = ''
        break
      case 'liquidity':
        key = ASSET_TYPE_LIQUIDITY[asset.asset_type] ?? 'Low'
        label = key
        color = LIQUIDITY_COLOR[key] ?? 'var(--cat-other)'
        break
      case 'country':
        key = CURRENCY_COUNTRY[asset.currency] ?? asset.currency
        label = key
        color = ''
        break
      case 'sector':
        key = ASSET_TYPE_SECTOR[asset.asset_type] ?? 'Other'
        label = key
        color = SECTOR_COLOR[key] ?? 'var(--cat-other)'
        break
      default:
        continue
    }

    const existing = map.get(key)
    if (existing) {
      existing.value += value
    } else {
      map.set(key, { label, value, color })
    }
  }

  const items = Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)

  if (type === 'portfolio' || type === 'currency' || type === 'country') {
    items.forEach((item, i) => { item.color = PALETTE[i % PALETTE.length] })
  }

  return items
}

function getSubLabel(type: AllocationType, count: number): string {
  switch (type) {
    case 'category':  return `${count} class${count !== 1 ? 'es' : ''}`
    case 'portfolio': return `${count} portfolio${count !== 1 ? 's' : ''}`
    case 'currency':  return `${count} currenc${count !== 1 ? 'ies' : 'y'}`
    case 'assets':    return `${count} position${count !== 1 ? 's' : ''}`
    case 'liquidity': return `${count} tier${count !== 1 ? 's' : ''}`
    case 'country':   return `${count} countr${count !== 1 ? 'ies' : 'y'}`
    case 'sector':    return `${count} sector${count !== 1 ? 's' : ''}`
  }
}

interface AllocationCardProps {
  defaultType: AllocationType
  enriched: Enriched[]
  portfolios: Portfolio[]
  selectedCurrency: CurrencyCode
}

export function AllocationCard({
  defaultType,
  enriched,
  portfolios,
  selectedCurrency,
}: AllocationCardProps) {
  const [allocType, setAllocType] = useState<AllocationType>(defaultType)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [listExpanded, setListExpanded] = useState(false)
  const [collapsedVisibleCount, setCollapsedVisibleCount] = useState(MIN_VISIBLE_ITEMS)
  const cardRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const { displayPrice } = useAmountDisplay()

  const items = useMemo(
    () => buildItems(enriched, portfolios, allocType),
    [enriched, portfolios, allocType],
  )

  const active = items.filter((i) => !excluded.has(i.key))
  const inactive = items.filter((i) => excluded.has(i.key))
  const activeTotal = active.reduce((s, i) => s + i.value, 0)

  const donutSegments = useMemo(() => {
    const activeItems = items.filter((i) => !excluded.has(i.key))
    const total = activeItems.reduce((s, i) => s + i.value, 0)
    if (total <= 0) return []

    let cumulative = 0
    let splitIndex = activeItems.length
    for (let i = 0; i < activeItems.length; i += 1) {
      cumulative += activeItems[i].value
      if (cumulative / total >= 0.8) {
        splitIndex = i + 1
        break
      }
    }

    const topItems = activeItems.slice(0, splitIndex)
    const otherItems = activeItems.slice(splitIndex)
    if (otherItems.length <= 2) {
      return activeItems.map((i) => ({ color: i.color, value: i.value, label: i.label }))
    }

    const othersValue = otherItems.reduce((s, i) => s + i.value, 0)
    return [
      ...topItems.map((i) => ({ color: i.color, value: i.value, label: i.label })),
      ...(othersValue > 0 ? [{ color: 'var(--border-strong)', value: othersValue, label: 'Others' }] : []),
    ]
  }, [items, excluded])

  useEffect(() => {
    if (listExpanded) return

    const card = cardRef.current
    const list = listRef.current
    if (!card || !list) return

    function calculateVisibleCount() {
      const currentCard = cardRef.current
      const currentList = listRef.current
      if (!currentCard || !currentList) return

      const totalCount = active.length + inactive.length
      if (totalCount <= MIN_VISIBLE_ITEMS) {
        setCollapsedVisibleCount(totalCount)
        return
      }

      const cardRect = currentCard.getBoundingClientRect()
      const listRect = currentList.getBoundingClientRect()
      const cardStyle = window.getComputedStyle(currentCard)
      const listStyle = window.getComputedStyle(currentList)
      const bottomPadding = Number.parseFloat(cardStyle.paddingBottom) || 0
      const listGap = Number.parseFloat(listStyle.rowGap || listStyle.gap) || 0
      const firstRow = currentList.querySelector<HTMLElement>('.alloc-row')
      const rowHeight = firstRow?.getBoundingClientRect().height || FALLBACK_ALLOC_ROW_HEIGHT
      const buttonHeight = expandButtonRef.current?.getBoundingClientRect().height || FALLBACK_ALLOC_BUTTON_HEIGHT
      const availableHeight = Math.max(0, cardRect.bottom - bottomPadding - listRect.top)
      const minimumCount = Math.min(MIN_VISIBLE_ITEMS, totalCount)
      let nextCount = minimumCount

      for (let count = minimumCount; count <= totalCount; count += 1) {
        const rowGaps = Math.max(0, count - 1) * listGap
        const rowsHeight = count * rowHeight + rowGaps
        const hasHiddenRows = count < totalCount
        const buttonSpace = hasHiddenRows ? buttonHeight + listGap : 0
        if (rowsHeight + buttonSpace <= availableHeight) {
          nextCount = count
        }
      }

      setCollapsedVisibleCount(nextCount)
    }

    calculateVisibleCount()

    const observer = new ResizeObserver(calculateVisibleCount)
    observer.observe(card)
    observer.observe(list)
    return () => observer.disconnect()
  }, [active.length, inactive.length, listExpanded])

  const displayedActive = listExpanded ? active : active.slice(0, collapsedVisibleCount)
  const displayedInactive = listExpanded
    ? inactive
    : inactive.slice(0, Math.max(0, collapsedVisibleCount - displayedActive.length))
  const displayedCount = displayedActive.length + displayedInactive.length
  const totalListCount = active.length + inactive.length
  const hasHiddenItems = displayedCount < totalListCount
  const showListButton = listExpanded ? totalListCount > MIN_VISIBLE_ITEMS : hasHiddenItems

  function toggle(key: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function changeType(t: AllocationType) {
    setAllocType(t)
    setExcluded(new Set())
    setOpen(false)
    setListExpanded(false)
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <h3>{ALLOC_LABELS[allocType]}</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No data yet.</p>
      </div>
    )
  }

  return (
    <div ref={cardRef} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-head">
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink)', padding: 0, fontFamily: 'inherit',
            }}
          >
            {ALLOC_LABELS[allocType]}
            <ChevronDown
              size={14}
              style={{
                color: 'var(--ink-muted)', flexShrink: 0,
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform .15s',
              }}
            />
          </button>
          <div className="sub">{getSubLabel(allocType, items.length)}</div>

          {open && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                onClick={() => setOpen(false)}
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                minWidth: 200, padding: '4px 0',
              }}>
                {(Object.keys(ALLOC_LABELS) as AllocationType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeType(t)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', fontSize: 13,
                      background: t === allocType ? 'var(--border)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: 'var(--ink)', fontWeight: t === allocType ? 500 : 400,
                      fontFamily: 'inherit',
                    }}
                  >
                    {ALLOC_LABELS[t]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
        <Donut
          segments={donutSegments}
          formatValue={(v) => displayPrice(v, selectedCurrency)}
        />
      </div>

      <div ref={listRef} className="alloc-list">
        {displayedActive.map((item) => {
          const pct = activeTotal > 0 ? (item.value / activeTotal) * 100 : 0
          return (
            <button
              key={item.key}
              className="alloc-row"
              onClick={() => toggle(item.key)}
              style={{
                display: 'grid', cursor: 'pointer',
                background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left',
              }}
            >
              <div className="swatch" style={{ background: item.color }} />
              <div className="alloc-name">{item.label}</div>
              <div className="alloc-pct">{pct.toFixed(1)}%</div>
              <div className="alloc-bar">
                <span style={{ width: `${pct}%`, background: item.color }} />
              </div>
            </button>
          )
        })}

        {displayedInactive.length > 0 && (
          <>
            {displayedActive.length > 0 && <div style={{ height: 1, margin: '4px 0' }} />}
            {displayedInactive.map((item) => (
              <button
                key={item.key}
                className="alloc-row"
                onClick={() => toggle(item.key)}
                style={{
                  display: 'grid', opacity: 0.38, cursor: 'pointer',
                  background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left',
                }}
              >
                <div className="swatch" style={{ background: 'var(--ink-faint)' }} />
                <div className="alloc-name">{item.label}</div>
                <div className="alloc-pct">—</div>
              </button>
            ))}
          </>
        )}

        {showListButton && (
          <button
            ref={expandButtonRef}
            type="button"
            onClick={() => setListExpanded((value) => !value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              minHeight: 34,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {listExpanded ? 'Collapse' : `View all ${totalListCount} items`}
            <ChevronDown
              size={13}
              style={{
                flexShrink: 0,
                transform: listExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform .15s',
              }}
            />
          </button>
        )}
      </div>
    </div>
  )
}
