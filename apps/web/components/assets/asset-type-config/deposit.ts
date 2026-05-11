import { defineAssetTypeConfig } from './common'
import { bankLikeConfig } from './bank-like'

export const depositConfig = defineAssetTypeConfig(bankLikeConfig, {
  assetDialog: {
    displayNamePlaceholder: 'e.g. 12-month CD',
  },
  scheduledEvents: {
    eventNamePlaceholder: 'e.g. CD interest',
  },
})
