import { defineAssetTypeConfig } from './common'
import { bankLikeConfig } from './bank-like'

export const cashConfig = defineAssetTypeConfig(bankLikeConfig, {
  assetDialog: {
    displayNamePlaceholder: 'e.g. Marcus High-Yield Savings',
  },
})
