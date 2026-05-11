import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const bondConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. TLT',
    symbolExamples: ['TLT', 'BND', 'IEF'],
    displayNamePlaceholder: 'e.g. Treasury bond ETF',
  },
  scheduledEvents: {
    allowedTypes: ['dividend'],
    labels: {
      dividend: 'Interest',
    },
    eventNamePlaceholder: 'e.g. Coupon payment',
  },
})
