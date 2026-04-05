export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompact(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  stock: 'Stock',
  bond: 'Bond',
  etf: 'ETF',
  crypto: 'Crypto',
  mutual_fund: 'Mutual Fund',
  real_estate: 'Real Estate',
  cash: 'Cash',
  commodity: 'Commodity',
  deposit: 'Bank Deposit',
  transport: 'Transport',
  business: 'Business',
  other: 'Other',
}

export const INCOME_FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

export function resolveHoldingPrice(
  holding: { symbol: string | null; average_cost_basis: number; manual_price: number | null },
  prices: Record<string, number>,
): { price: number; source: 'live' | 'manual' | 'cost_basis' } {
  if (holding.symbol) {
    const live = prices[holding.symbol.toUpperCase()]
    if (live != null) return { price: live, source: 'live' }
  }
  if (holding.manual_price != null) {
    return { price: holding.manual_price, source: 'manual' }
  }
  return { price: Number(holding.average_cost_basis), source: 'cost_basis' }
}

export const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'KZT', 'CNY', 'JPY', 'CHF', 'CAD', 'AUD']

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  split: 'Split',
}
