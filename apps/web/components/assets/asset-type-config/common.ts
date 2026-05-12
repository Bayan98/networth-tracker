import type { AssetType, TransactionType } from '@networth/types'

export const ASSET_TYPES = [
  'stock',
  'etf',
  'mutual_fund',
  'bond',
  'commodity',
  'crypto',
  'cash',
  'deposit',
  'business',
  'real_estate',
  'transport',
  'other',
] as const satisfies readonly AssetType[]

export const VALID_TRANSACTION_TYPES = [
  'buy',
  'sell',
  'dividend',
  'deposit',
  'withdrawal',
  'split',
] as const satisfies readonly TransactionType[]

export type TransactionLabels = Partial<Record<TransactionType, string>>

export interface AssetDialogConfig {
  showSymbol: boolean
  symbolPlaceholder: string
  symbolExamples: readonly string[]
  displayNamePlaceholder: string
  manualPrice: {
    show: boolean
    label: string
    helper: string
    placeholder: string
  }
  notesPlaceholder: string
}

export interface TransactionFormConfig {
  allowedTypes: readonly TransactionType[]
  defaultType: TransactionType
  labels: TransactionLabels
  showQuantity: boolean
  quantityLabel: string
  quantityPlaceholder: string
  priceLabel: string
  pricePlaceholder: string
  notePlaceholder: string
}

export interface ScheduledEventsConfig {
  allowedTypes: readonly TransactionType[]
  defaultType: TransactionType
  labels: TransactionLabels
  eventNamePlaceholder: string
  amountLabel: string
  amountPlaceholder: string
  notePlaceholder: string
}

export interface AssetTypeConfig {
  assetDialog: AssetDialogConfig
  transactions: TransactionFormConfig
  scheduledEvents: ScheduledEventsConfig
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

export const transactionLabels: Record<TransactionType, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  split: 'Split',
}

export const genericAssetTypeConfig: AssetTypeConfig = {
  assetDialog: {
    showSymbol: true,
    symbolPlaceholder: 'e.g. AAPL',
    symbolExamples: ['AAPL', 'MSFT', 'SPY'],
    displayNamePlaceholder: 'e.g. Apple Inc.',
    manualPrice: {
      show: false,
      label: 'Current market value',
      helper: 'per unit · optional',
      placeholder: 'e.g. 250000',
    },
    notesPlaceholder: 'Thesis, target price, reminders...',
  },
  transactions: {
    allowedTypes: VALID_TRANSACTION_TYPES,
    defaultType: 'buy',
    labels: transactionLabels,
    showQuantity: true,
    quantityLabel: 'Quantity',
    quantityPlaceholder: '10',
    priceLabel: 'Price / unit',
    pricePlaceholder: '150.00',
    notePlaceholder: 'e.g. Quarterly rebalance',
  },
  scheduledEvents: {
    allowedTypes: ['dividend', 'deposit', 'withdrawal'],
    defaultType: 'dividend',
    labels: transactionLabels,
    eventNamePlaceholder: 'e.g. Quarterly dividend',
    amountLabel: 'Amount',
    amountPlaceholder: '500',
    notePlaceholder: 'Optional note',
  },
}

export function defineAssetTypeConfig(
  base: AssetTypeConfig,
  override: DeepPartial<AssetTypeConfig> = {},
): AssetTypeConfig {
  return {
    assetDialog: {
      ...base.assetDialog,
      ...override.assetDialog,
      manualPrice: {
        ...base.assetDialog.manualPrice,
        ...override.assetDialog?.manualPrice,
      },
    },
    transactions: {
      ...base.transactions,
      ...override.transactions,
      labels: {
        ...base.transactions.labels,
        ...override.transactions?.labels,
      },
    },
    scheduledEvents: {
      ...base.scheduledEvents,
      ...override.scheduledEvents,
      labels: {
        ...base.scheduledEvents.labels,
        ...override.scheduledEvents?.labels,
      },
    },
  }
}

export function withCurrentType(
  allowedTypes: readonly TransactionType[],
  currentType: TransactionType,
): readonly TransactionType[] {
  return allowedTypes.includes(currentType) ? allowedTypes : [currentType, ...allowedTypes]
}
