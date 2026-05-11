import { defineAssetTypeConfig, genericAssetTypeConfig } from './common'

export const physicalPrivateConfig = defineAssetTypeConfig(genericAssetTypeConfig, {
  assetDialog: {
    showSymbol: false,
    displayNamePlaceholder: 'e.g. Private asset',
    manualPrice: {
      show: true,
      placeholder: 'e.g. 250000',
    },
    notesPlaceholder: 'Valuation notes, appraisal details, reminders...',
  },
  transactions: {
    allowedTypes: ['buy', 'sell', 'deposit', 'withdrawal'],
    labels: {
      buy: 'Purchase',
      sell: 'Sale',
      deposit: 'Contribution',
      withdrawal: 'Distribution',
    },
    quantityPlaceholder: '1',
    pricePlaceholder: '250000',
    notePlaceholder: 'e.g. Appraisal update',
  },
  scheduledEvents: {
    allowedTypes: ['dividend', 'deposit', 'withdrawal'],
    defaultType: 'dividend',
    labels: {
      dividend: 'Income',
    },
    eventNamePlaceholder: 'e.g. Monthly income',
    amountPlaceholder: '1000',
  },
})
