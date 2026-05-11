import { defineAssetTypeConfig, genericAssetTypeConfig } from './common'

export const priceTradedConfig = defineAssetTypeConfig(genericAssetTypeConfig, {
  transactions: {
    allowedTypes: ['buy', 'sell', 'dividend', 'split'],
  },
  scheduledEvents: {
    allowedTypes: ['dividend'],
    defaultType: 'dividend',
  },
})
