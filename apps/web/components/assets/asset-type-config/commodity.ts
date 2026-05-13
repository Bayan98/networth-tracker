import { defineAssetTypeConfig } from './common'
import { priceTradedConfig } from './price-traded'

export const commodityConfig = defineAssetTypeConfig(priceTradedConfig, {
  assetDialog: {
    symbolPlaceholder: 'e.g. GC=F',
    symbolExamples: ['GC=F', 'SI=F', 'GLD'],
    symbolPresetLabel: 'Commodity',
    symbolPresets: [
      { id: 'gold', label: 'Gold', symbol: 'GC=F', name: 'Gold' },
      { id: 'silver', label: 'Silver', symbol: 'SI=F', name: 'Silver' },
      { id: 'other', label: 'Other', symbol: null, symbolRequired: false, name: '' },
    ],
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

export function isGramPricedMetal(symbol?: string | null): boolean {
  const normalized = symbol?.toUpperCase().trim()
  return normalized === 'GC=F' || normalized === 'SI=F'
}
