import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const stockConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. AAPL',
    symbolExamples: ['AAPL', 'MSFT', 'NVDA'],
    displayNamePlaceholder: 'e.g. Apple Inc.',
  },
})
