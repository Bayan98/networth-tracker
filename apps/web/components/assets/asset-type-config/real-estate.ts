import { defineAssetTypeConfig } from './common'
import { physicalPrivateConfig } from './physical-private'

export const realEstateConfig = defineAssetTypeConfig(physicalPrivateConfig, {
  assetDialog: {
    displayNamePlaceholder: 'e.g. Primary residence',
    notesPlaceholder: 'Address, appraisal details, renovation notes...',
  },
  transactions: {
    labels: {
      buy: 'Purchase',
      sell: 'Sale',
      deposit: 'Improvement',
      withdrawal: 'Expense',
    },
    notePlaceholder: 'e.g. Renovation, closing costs, appraisal',
  },
  scheduledEvents: {
    labels: {
      dividend: 'Rent',
    },
    eventNamePlaceholder: 'e.g. Monthly rent',
    amountPlaceholder: '2500',
  },
})
