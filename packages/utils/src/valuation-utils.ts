export type PriceSource = 'manual' | 'live' | 'cost_basis'

interface PriceableAsset {
  symbol: string | null
  currency: string
  manual_price: number | null
  manual_price_date?: string | null
}

export interface ResolvedAssetPrice {
  price: number
  source: PriceSource
}

export interface HoldingValuationInput {
  asset: PriceableAsset
  prices: Record<string, number>
  priceCurrencies: Record<string, string>
  quantity: number
  averageCost: number
  periodStartPrice: number | null
  todayFx: (from: string) => number | null
}

export interface HoldingValuationResult {
  source: PriceSource
  quantity: number
  averageCost: number
  currentPrice: number
  currentPriceCurrency: string
  currentValue: number | null
  costBasis: number | null
  periodStartPrice: number | null
  periodStartValue: number | null
  priceReturnAbs: number | null
  priceReturnPct: number | null
}

export function safePercentChange(change: number | null, base: number | null): number | null {
  if (change === null || base === null || base === 0) return null
  const pct = (change / base) * 100
  return Number.isFinite(pct) ? pct : null
}

export function resolveAssetPrice(
  asset: { symbol: string | null; manual_price: number | null },
  prices: Record<string, number>,
): ResolvedAssetPrice {
  if (asset.manual_price != null) {
    return { price: asset.manual_price, source: 'manual' }
  }
  if (asset.symbol) {
    const live = prices[asset.symbol.toUpperCase()]
    if (live != null) return { price: live, source: 'live' }
  }
  return { price: 0, source: 'cost_basis' }
}

export function manualPriceForDate(
  asset: PriceableAsset,
  date: string,
  averageCost: number,
  firstTransactionDate?: string,
): number | null {
  if (asset.manual_price == null) return null
  if (asset.manual_price_date == null || date >= asset.manual_price_date) {
    return asset.manual_price
  }
  if (!firstTransactionDate || firstTransactionDate >= asset.manual_price_date) {
    return averageCost
  }

  const startMs = new Date(firstTransactionDate + 'T12:00:00Z').getTime()
  const manualMs = new Date(asset.manual_price_date + 'T12:00:00Z').getTime()
  const dateMs = new Date(date + 'T12:00:00Z').getTime()
  const t = Math.max(0, Math.min(1, (dateMs - startMs) / (manualMs - startMs)))
  return averageCost + (asset.manual_price - averageCost) * t
}

export function calculateHoldingValuation(input: HoldingValuationInput): HoldingValuationResult {
  const {
    asset,
    prices,
    priceCurrencies,
    quantity,
    averageCost,
    periodStartPrice,
    todayFx,
  } = input

  const resolved = resolveAssetPrice(asset, prices)
  const currentPrice = resolved.source === 'cost_basis' ? averageCost : resolved.price
  const symbol = asset.symbol?.toUpperCase() ?? ''
  const currentPriceCurrency = resolved.source === 'live'
    ? (priceCurrencies[symbol] ?? 'USD').toUpperCase()
    : asset.currency.toUpperCase()
  const currentFx = todayFx(currentPriceCurrency)
  const assetFx = todayFx(asset.currency)
  const currentValue = quantity <= 0
    ? 0
    : currentFx !== null && currentPrice > 0
    ? quantity * currentPrice * currentFx
    : null
  const costBasis = quantity <= 0 ? 0 : assetFx !== null ? quantity * averageCost * assetFx : null
  const normalizedPeriodStartPrice = resolved.source === 'live' ? periodStartPrice : null
  const periodStartValue = normalizedPeriodStartPrice !== null && currentFx !== null
    ? quantity * normalizedPeriodStartPrice * currentFx
    : null
  const priceReturnAbs = currentValue !== null && periodStartValue !== null
    ? currentValue - periodStartValue
    : null
  const priceReturnPct = safePercentChange(priceReturnAbs, periodStartValue)

  return {
    source: resolved.source,
    quantity,
    averageCost,
    currentPrice,
    currentPriceCurrency,
    currentValue,
    costBasis,
    periodStartPrice: normalizedPeriodStartPrice,
    periodStartValue,
    priceReturnAbs,
    priceReturnPct,
  }
}
