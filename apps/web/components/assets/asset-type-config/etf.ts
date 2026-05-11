import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const etfConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. SPY',
    symbolExamples: ['SPY', 'VOO', 'QQQ'],
    displayNamePlaceholder: 'e.g. Vanguard S&P 500 ETF',
  },
})
