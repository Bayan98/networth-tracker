import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const commodityConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. GC=F',
    symbolExamples: ['GC=F', 'SI=F', 'GLD'],
    displayNamePlaceholder: 'e.g. Gold',
  },
  scheduledEvents: {
    allowedTypes: ['dividend'],
    labels: {
      dividend: 'Income',
    },
    eventNamePlaceholder: 'e.g. Storage income',
  },
})
