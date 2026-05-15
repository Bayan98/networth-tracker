import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const bondConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. TLT',
    symbolExamples: ['TLT', 'BND', 'IEF'],
    displayNamePlaceholder: 'e.g. Treasury bond ETF',
  },
  transactions: {
    allowedTypes: ['buy', 'sell', 'dividend'],
    labels: {
      dividend: 'Coupon',
    },
    typeOverrides: {
      dividend: {
        showQuantity: false,
        priceLabel: 'Coupon Total Price',
        pricePlaceholder: '500',
      },
    },
  },
  scheduledEvents: {
    allowedTypes: ['buy', 'sell', 'dividend'],
    defaultType: 'dividend',
    allowedFrequencies: ['quarterly', 'annually'],
    defaultFrequency: 'quarterly',
    labels: {
      dividend: 'Coupon',
    },
    eventNamePlaceholder: 'e.g. Coupon payment',
  },
  detail: {
    tabs: ['Transactions', 'Scheduled', 'Notes'],
  },
})
