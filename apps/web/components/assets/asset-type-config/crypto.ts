import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const cryptoConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. BTC',
    symbolExamples: ['BTC', 'ETH', 'SOL'],
    displayNamePlaceholder: 'e.g. Bitcoin',
  },
  scheduledEvents: {
    allowedTypes: ['dividend'],
    labels: {
      dividend: 'Yield',
    },
    eventNamePlaceholder: 'e.g. Staking yield',
  },
})
