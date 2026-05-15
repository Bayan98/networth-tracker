import type { AssetType, IncomeFrequency, TransactionType } from '@networth/types'

export const ASSET_TYPES = [
  'stock',
  'etf',
  'mutual_fund',
  'bond',
  'commodity',
  'crypto',
  'cash',
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

export const ASSET_DETAIL_TABS = [
  'Overview',
  'Charts',
  'Transactions',
  'Scheduled',
  'News',
  'Notes',
] as const

export type AssetDetailTab = typeof ASSET_DETAIL_TABS[number]

export type TransactionLabels = Partial<Record<TransactionType, string>>

export interface AssetDialogSymbolPreset {
  id: string
  label: string
  symbol: string | null
  symbolRequired?: boolean
  name: string
}

export interface AssetDialogConfig {
  showSymbol: boolean
  symbolPlaceholder: string
  symbolExamples: readonly string[]
  symbolPresetLabel?: string
  symbolPresets?: readonly AssetDialogSymbolPreset[]
  displayNamePlaceholder: string
  manualPrice: {
    show: boolean
    label: string
    helper: string
    placeholder: string
  }
  notesPlaceholder: string
}

export interface TransactionFieldConfig {
  showQuantity: boolean
  quantityLabel: string
  quantityPlaceholder: string
  priceLabel: string
  pricePlaceholder: string
  notePlaceholder: string
}

export interface TransactionFormConfig extends TransactionFieldConfig {
  allowedTypes: readonly TransactionType[]
  defaultType: TransactionType
  labels: TransactionLabels
  typeOverrides: Partial<Record<TransactionType, Partial<TransactionFieldConfig>>>
}

export interface ScheduledEventsConfig {
  allowedTypes: readonly TransactionType[]
  defaultType: TransactionType
  allowedFrequencies: readonly IncomeFrequency[]
  defaultFrequency: IncomeFrequency
  labels: TransactionLabels
  eventNamePlaceholder: string
  amountLabel: string
  amountPlaceholder: string
  notePlaceholder: string
}

export interface DetailConfig {
  tabs: readonly AssetDetailTab[]
}

export interface AssetTypeConfig {
  assetDialog: AssetDialogConfig
  transactions: TransactionFormConfig
  scheduledEvents: ScheduledEventsConfig
  detail: DetailConfig
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
    typeOverrides: {},
  },
  scheduledEvents: {
    allowedTypes: ['dividend', 'deposit', 'withdrawal'],
    defaultType: 'dividend',
    allowedFrequencies: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
    defaultFrequency: 'monthly',
    labels: transactionLabels,
    eventNamePlaceholder: 'e.g. Quarterly dividend',
    amountLabel: 'Amount',
    amountPlaceholder: '500',
    notePlaceholder: 'Optional note',
  },
  detail: {
    tabs: ASSET_DETAIL_TABS,
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
      typeOverrides: {
        ...base.transactions.typeOverrides,
        ...override.transactions?.typeOverrides,
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
    detail: {
      ...base.detail,
      ...override.detail,
    },
  }
}

export function getTransactionFieldConfig(
  config: AssetTypeConfig,
  transactionType: TransactionType,
): TransactionFieldConfig {
  const override = config.transactions.typeOverrides[transactionType]

  return {
    showQuantity: override?.showQuantity ?? config.transactions.showQuantity,
    quantityLabel: override?.quantityLabel ?? config.transactions.quantityLabel,
    quantityPlaceholder: override?.quantityPlaceholder ?? config.transactions.quantityPlaceholder,
    priceLabel: override?.priceLabel ?? config.transactions.priceLabel,
    pricePlaceholder: override?.pricePlaceholder ?? config.transactions.pricePlaceholder,
    notePlaceholder: override?.notePlaceholder ?? config.transactions.notePlaceholder,
  }
}

export function withCurrentType(
  allowedTypes: readonly TransactionType[],
  currentType: TransactionType,
): readonly TransactionType[] {
  return allowedTypes.includes(currentType) ? allowedTypes : [currentType, ...allowedTypes]
}

export function withCurrentFrequency(
  allowedFrequencies: readonly IncomeFrequency[],
  currentFrequency: IncomeFrequency,
): readonly IncomeFrequency[] {
  return allowedFrequencies.includes(currentFrequency)
    ? allowedFrequencies
    : [currentFrequency, ...allowedFrequencies]
}
