import { defineAssetTypeConfig } from './common'
import { physicalPrivateConfig } from './physical-private'

export const businessConfig = defineAssetTypeConfig(physicalPrivateConfig, {
  assetDialog: {
    displayNamePlaceholder: 'e.g. Studio LLC',
    notesPlaceholder: 'Ownership, valuation method, key dates...',
  },
  scheduledEvents: {
    eventNamePlaceholder: 'e.g. Profit distribution',
  },
})
