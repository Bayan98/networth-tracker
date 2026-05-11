import { defineAssetTypeConfig, genericAssetTypeConfig } from './common'

export const bankLikeConfig = defineAssetTypeConfig(genericAssetTypeConfig, {
  assetDialog: {
    showSymbol: false,
    displayNamePlaceholder: 'e.g. High-yield savings',
    manualPrice: {
      show: true,
      placeholder: 'e.g. 1',
    },
    notesPlaceholder: 'Account details, renewal terms, reminders...',
  },
  transactions: {
    allowedTypes: ['deposit', 'withdrawal', 'dividend'],
    defaultType: 'deposit',
    labels: {
      dividend: 'Interest',
    },
    showQuantity: false,
    quantityLabel: 'Units',
    quantityPlaceholder: '1',
    priceLabel: 'Amount',
    pricePlaceholder: '1000',
    notePlaceholder: 'e.g. Monthly transfer',
  },
  scheduledEvents: {
    allowedTypes: ['dividend', 'deposit', 'withdrawal'],
    defaultType: 'dividend',
    labels: {
      dividend: 'Interest',
    },
    eventNamePlaceholder: 'e.g. Monthly interest',
    amountPlaceholder: '50',
  },
})
