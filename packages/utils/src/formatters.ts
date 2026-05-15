export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
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
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export function currencySymbol(currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

export function displayHiddenPrice(currencyOrLength: string | number = 'USD', length = 5): string {
  const currency = typeof currencyOrLength === 'number' ? 'USD' : currencyOrLength
  const rawLength = typeof currencyOrLength === 'number' ? currencyOrLength : length
  const safeLength = Number.isFinite(rawLength) ? Math.max(1, Math.floor(rawLength)) : 5
  return currencySymbol(currency).repeat(safeLength)
}

export function displayPrice(
  amount: number | null | undefined,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions & {
    compact?: boolean
    empty?: string
    hideAmounts?: boolean
    loading?: boolean
    loadingText?: string
    maskLength?: number
    withSign?: boolean
  } = {},
): string {
  const {
    compact = false,
    empty = '—',
    hideAmounts = false,
    loading = false,
    loadingText = '…',
    maskLength,
    withSign = false,
    ...intlOptions
  } = options

  if (loading) return loadingText
  if (hideAmounts) return displayHiddenPrice(currency, maskLength)
  if (amount == null) return empty

  const value = withSign ? Math.abs(amount) : amount
  const formatted = compact
    ? formatCompact(value, currency)
    : formatCurrency(value, currency, intlOptions)

  return withSign && amount >= 0 ? `+${formatted}` : withSign ? `-${formatted}` : formatted
}

export function displayQuantity(
  quantity: number | null | undefined,
  options: Intl.NumberFormatOptions & {
    empty?: string
    hideAmounts?: boolean
    loading?: boolean
    loadingText?: string
  } = {},
): string {
  const {
    empty = '—',
    hideAmounts = false,
    loading = false,
    loadingText = '…',
    maximumFractionDigits = 6,
    ...intlOptions
  } = options

  if (loading) return loadingText
  if (hideAmounts) return 'X'
  if (quantity == null) return empty

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    ...intlOptions,
  }).format(quantity)
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

export const POPULAR_CURRENCIES = ['USD', 'EUR', 'KZT', 'RUB', 'GBP', 'CNY']

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  split: 'Split',
}
