import { defineAssetTypeConfig } from './common'
import { physicalPrivateConfig } from './physical-private'

export const transportConfig = defineAssetTypeConfig(physicalPrivateConfig, {
  assetDialog: {
    displayNamePlaceholder: 'e.g. Tesla Model 3',
    notesPlaceholder: 'VIN, mileage, service history, valuation notes...',
  },
  scheduledEvents: {
    eventNamePlaceholder: 'e.g. Lease income',
  },
  detail: {
    tabs: ['Transactions', 'Scheduled', 'Notes'],
  },
})
