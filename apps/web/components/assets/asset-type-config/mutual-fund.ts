import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const mutualFundConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. VTSAX',
    symbolExamples: ['VTSAX', 'FXAIX', 'SWPPX'],
    displayNamePlaceholder: 'e.g. Vanguard Total Stock Market Index',
  },
})
