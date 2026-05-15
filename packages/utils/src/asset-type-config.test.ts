import { describe, expect, it } from 'vitest'
import type { TransactionType } from '@networth/types'
import {
  ASSET_TYPES,
  VALID_TRANSACTION_TYPES,
  assetTypeConfigs,
  getAssetTypeConfig,
  getTransactionFieldConfig,
} from '../../../apps/web/components/assets/asset-type-config'

describe('asset type config resolver', () => {
  const validTransactionTypes = new Set<TransactionType>(VALID_TRANSACTION_TYPES)

  it('has a config for every asset type', () => {
    for (const assetType of ASSET_TYPES) {
      expect(assetTypeConfigs[assetType]).toBeDefined()
      expect(getAssetTypeConfig(assetType)).toBe(assetTypeConfigs[assetType])
    }
  })

  it('only allows valid transaction types', () => {
    for (const assetType of ASSET_TYPES) {
      const config = getAssetTypeConfig(assetType)
      const configuredTypes = [
        ...config.transactions.allowedTypes,
        ...config.scheduledEvents.allowedTypes,
      ]

      for (const type of configuredTypes) {
        expect(validTransactionTypes.has(type)).toBe(true)
      }
    }
  })

  it('excludes withdrawals for stock transactions', () => {
    expect(getAssetTypeConfig('stock').transactions.allowedTypes).not.toContain('withdrawal')
  })

  it('excludes buys and sells for cash', () => {
    const allowedTypes = getAssetTypeConfig('cash').transactions.allowedTypes

    expect(allowedTypes).not.toContain('buy')
    expect(allowedTypes).not.toContain('sell')
  })

  it('hides transaction quantity for cash', () => {
    expect(getAssetTypeConfig('cash').transactions.showQuantity).toBe(false)
    expect(getAssetTypeConfig('stock').transactions.showQuantity).toBe(true)
  })

  it('labels scheduled real estate dividends as rent', () => {
    expect(getAssetTypeConfig('real_estate').scheduledEvents.labels.dividend).toBe('Rent')
  })

  it('configures bond transactions as buy, sell, and coupon', () => {
    const config = getAssetTypeConfig('bond')
    const couponFields = getTransactionFieldConfig(config, 'dividend')

    expect(config.transactions.allowedTypes).toEqual(['buy', 'sell', 'dividend'])
    expect(config.transactions.allowedTypes).not.toContain('split')
    expect(config.transactions.labels.dividend).toBe('Coupon')
    expect(couponFields.showQuantity).toBe(false)
    expect(couponFields.priceLabel).toBe('Coupon Total Price')
    expect(getTransactionFieldConfig(config, 'buy').showQuantity).toBe(true)
  })

  it('configures bond scheduled events as buy, sell, and coupon with limited frequencies', () => {
    const config = getAssetTypeConfig('bond')

    expect(config.scheduledEvents.allowedTypes).toEqual(['buy', 'sell', 'dividend'])
    expect(config.scheduledEvents.labels.dividend).toBe('Coupon')
    expect(config.scheduledEvents.allowedFrequencies).toEqual(['quarterly', 'annually'])
    expect(config.scheduledEvents.defaultFrequency).toBe('quarterly')
  })

  it('limits stock and fund scheduled events to buy and sell', () => {
    expect(getAssetTypeConfig('stock').scheduledEvents.allowedTypes).toEqual(['buy', 'sell'])
    expect(getAssetTypeConfig('etf').scheduledEvents.allowedTypes).toEqual(['buy', 'sell'])
    expect(getAssetTypeConfig('mutual_fund').scheduledEvents.allowedTypes).toEqual(['buy', 'sell'])
  })

  it('only enables charts for market-tracked asset types', () => {
    const withCharts = ASSET_TYPES.filter((assetType) => getAssetTypeConfig(assetType).detail.tabs.includes('Charts'))

    expect(withCharts).toEqual(['stock', 'etf', 'mutual_fund', 'commodity', 'crypto'])
  })

  it('hides overview, news, and charts for selected asset types', () => {
    const hiddenTypes = ['bond', 'other', 'real_estate', 'transport', 'cash'] as const

    for (const assetType of hiddenTypes) {
      const tabs = getAssetTypeConfig(assetType).detail.tabs

      expect(tabs).not.toContain('Overview')
      expect(tabs).not.toContain('News')
      expect(tabs).not.toContain('Charts')
    }
  })
})
