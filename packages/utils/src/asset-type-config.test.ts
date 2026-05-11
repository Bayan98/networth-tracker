import { describe, expect, it } from 'vitest'
import type { TransactionType } from '@networth/types'
import {
  ASSET_TYPES,
  VALID_TRANSACTION_TYPES,
  assetTypeConfigs,
  getAssetTypeConfig,
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

  it('excludes buys and sells for cash and deposits', () => {
    for (const assetType of ['cash', 'deposit'] as const) {
      const allowedTypes = getAssetTypeConfig(assetType).transactions.allowedTypes

      expect(allowedTypes).not.toContain('buy')
      expect(allowedTypes).not.toContain('sell')
    }
  })

  it('hides transaction quantity for cash and deposits', () => {
    expect(getAssetTypeConfig('cash').transactions.showQuantity).toBe(false)
    expect(getAssetTypeConfig('deposit').transactions.showQuantity).toBe(false)
    expect(getAssetTypeConfig('stock').transactions.showQuantity).toBe(true)
  })

  it('labels scheduled real estate dividends as rent', () => {
    expect(getAssetTypeConfig('real_estate').scheduledEvents.labels.dividend).toBe('Rent')
  })
})
