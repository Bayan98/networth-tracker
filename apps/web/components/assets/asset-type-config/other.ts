import { defineAssetTypeConfig } from './common'
import { physicalPrivateConfig } from './physical-private'

export const otherConfig = defineAssetTypeConfig(physicalPrivateConfig, {
  assetDialog: {
    displayNamePlaceholder: 'e.g. Watch collection',
    notesPlaceholder: 'Condition, provenance, appraisal notes...',
  },
  detail: {
    tabs: ['Transactions', 'Scheduled', 'Notes'],
  },
})
