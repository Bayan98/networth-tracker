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

export const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'KZT', 'CNY', 'JPY', 'CHF', 'CAD', 'AUD']

export const DEBT_TYPE_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  car_loan: 'Car Loan',
  student_loan: 'Student Loan',
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  other: 'Other',
}
