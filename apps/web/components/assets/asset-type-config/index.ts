import type { AssetType } from '@networth/types'
import { bondConfig } from './bond'
import { businessConfig } from './business'
import { cashConfig } from './cash'
import { commodityConfig } from './commodity'
import { cryptoConfig } from './crypto'
import { etfConfig } from './etf'
import { mutualFundConfig } from './mutual-fund'
import { otherConfig } from './other'
import { realEstateConfig } from './real-estate'
import { stockConfig } from './stock'
import { transportConfig } from './transport'
import { genericAssetTypeConfig, type AssetTypeConfig } from './common'

export {
  isGramPricedMetal,
} from './commodity'

export {
  ASSET_TYPES,
  VALID_TRANSACTION_TYPES,
  genericAssetTypeConfig,
  withCurrentType,
  type AssetTypeConfig,
  type ScheduledEventsConfig,
  type TransactionFormConfig,
} from './common'

export const assetTypeConfigs: Record<AssetType, AssetTypeConfig> = {
  stock: stockConfig,
  bond: bondConfig,
  etf: etfConfig,
  crypto: cryptoConfig,
  mutual_fund: mutualFundConfig,
  real_estate: realEstateConfig,
  cash: cashConfig,
  commodity: commodityConfig,
  transport: transportConfig,
  business: businessConfig,
  other: otherConfig,
}

export function getAssetTypeConfig(assetType?: AssetType | null): AssetTypeConfig {
  if (!assetType) return genericAssetTypeConfig
  return assetTypeConfigs[assetType] ?? genericAssetTypeConfig
}
