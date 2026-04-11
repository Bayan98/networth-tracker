import { describe, it, expect } from 'vitest'
import { computeSeries } from './portfolio-series'
import type { RawTransaction, PriceHistory, FxRates } from './portfolio-series'
import type { Asset } from '@networth/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<Asset> & { id: string; currency: string }): Asset {
  return {
    id: overrides.id,
    portfolio_id: null,
    asset_name: overrides.asset_name ?? 'Test Asset',
    symbol: overrides.symbol ?? null,
    asset_type: overrides.asset_type ?? 'stock',
    quantity: overrides.quantity ?? '0',
    average_cost_basis: overrides.average_cost_basis ?? '0',
    total_income_earned: overrides.total_income_earned ?? '0',
    currency: overrides.currency,
    manual_price: overrides.manual_price ?? null,
    manual_price_date: overrides.manual_price_date ?? null,
    notes: overrides.notes ?? null,
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeTx(overrides: Partial<RawTransaction> & {
  asset_id: string
  quantity: number
  price: number
  currency: string
}): RawTransaction {
  return {
    transaction_type: 'buy',
    executed_at: '2024-01-01',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Scenario 1 — Transaction currency → asset currency
//
// A user buys a USD-denominated asset but pays in KZT.
// The transaction is recorded in KZT; the asset tracks cost in USD.
// Expected: cost basis is stored in USD using the KZT→USD FX rate at the tx date.
// ---------------------------------------------------------------------------

describe('Scenario 1 — transaction currency converts to asset currency', () => {
  /**
   * Setup:
   *   - 1 asset: "AAPL" in USD
   *   - 1 buy transaction: 10 shares @ 450,000 KZT per share (paid in KZT)
   *   - KZT→USD rate on 2024-01-01: 0.00215 (1 KZT ≈ 0.00215 USD)
   *   - Expected price in USD: 450,000 × 0.00215 = 967.50 USD per share
   *   - Expected cost basis: 10 × 967.50 = 9,675 USD
   */
  const asset = makeAsset({ id: 'h1', symbol: 'AAPL', asset_type: 'stock', currency: 'USD' })
  const transaction = makeTx({
    asset_id: 'h1',
    quantity: 10,
    price: 450_000,   // KZT per share
    currency: 'KZT',
    executed_at: '2024-01-01',
    transaction_type: 'buy',
  })
  const fxRates: FxRates = {
    'KZT_USD_2024-01-01': 0.00215, // KZT → USD
    'USD_USD_2024-01-01': 1,
  }

  it('converts tx price from KZT to USD for cost basis accumulation', () => {
    const series = computeSeries(
      ['2024-01-01'],
      [transaction],
      [asset],
      {},          // no price history → falls back to cost basis for market value too
      fxRates,
      'USD',
    )

    expect(series).toHaveLength(1)
    const point = series[0]
    // 10 shares × (450,000 KZT × 0.00215 KZT→USD) = 10 × 967.50 = 9,675
    expect(point.costBasis).toBeCloseTo(9_675, 2)
  })

  it('market value equals cost basis when no price history (lines overlap)', () => {
    const series = computeSeries(
      ['2024-01-01'],
      [transaction],
      [asset],
      {},
      fxRates,
      'USD',
    )
    // No live price → marketValue uses running avg cost = costBasis (lines overlap)
    // 10 shares × 967.50 USD avg cost = 9,675 USD
    expect(series[0].marketValue).toBeCloseTo(9_675, 2)
    expect(series[0].marketValue).toBeCloseTo(series[0].costBasis, 2)
  })

  it('market value uses USD price history when available', () => {
    const priceHistory: PriceHistory = {
      AAPL: [{ date: '2024-01-01', price: 185 }], // USD
    }
    const series = computeSeries(
      ['2024-01-01'],
      [transaction],
      [asset],
      priceHistory,
      fxRates,
      'USD',
    )
    // 10 shares × $185 × fx(USD→USD=1) = 1,850
    expect(series[0].marketValue).toBeCloseTo(1_850, 2)
    // cost basis unchanged
    expect(series[0].costBasis).toBeCloseTo(9_675, 2)
  })

  it('sell transaction reduces cost basis using avg cost (not sell price)', () => {
    const sellTx = makeTx({
      asset_id: 'h1',
      quantity: 5,
      price: 460_000,
      currency: 'KZT',
      executed_at: '2024-02-01',
      transaction_type: 'sell',
    })
    const fxWithFeb: FxRates = {
      ...fxRates,
      'KZT_USD_2024-02-01': 0.00215,
      'USD_USD_2024-02-01': 1,
    }
    const series = computeSeries(
      ['2024-01-01', '2024-02-01'],
      [transaction, sellTx],
      [asset],
      {},
      fxWithFeb,
      'USD',
    )
    // After buy:  10 × 967.50 = 9,675 USD
    expect(series[0].costBasis).toBeCloseTo(9_675, 2)
    // After sell 5 units: subtract 5 × avg_cost (967.50) = 4,837.50 → remaining 4,837.50 USD
    // (NOT 5 × sell_price: that would conflate sell proceeds with cost basis)
    expect(series[1].costBasis).toBeCloseTo(4_837.5, 2)
  })
})

// ---------------------------------------------------------------------------
// Scenario 2 — Assets in different currencies → single display currency
//
// A portfolio has two assets denominated in different currencies.
// Both must be converted to the display currency before summing.
// ---------------------------------------------------------------------------

describe('Scenario 2 — multi-currency assets sum correctly in display currency', () => {
  /**
   * Setup:
   *   - Asset A: "Car" in KZT  → 1 unit @ 5,000,000 KZT avg cost
   *   - Asset B: "AAPL" in USD → 10 shares @ 150 USD avg cost
   *   - Display currency: USD
   *   - KZT→USD rate: 0.00215
   *   - Expected costBasis in USD:
   *       KZT asset: 5,000,000 × 0.00215 = 10,750 USD
   *       USD asset: 10 × 150 × 1.0     = 1,500 USD
   *       Total: 12,250 USD
   */
  const kztAsset = makeAsset({
    id: 'h-kzt',
    asset_name: 'Машина',
    asset_type: 'other',
    currency: 'KZT',
    manual_price: 5_000_000, // KZT
  })
  const usdAsset = makeAsset({
    id: 'h-usd',
    symbol: 'AAPL',
    asset_type: 'stock',
    currency: 'USD',
  })

  const kztTx = makeTx({
    asset_id: 'h-kzt',
    quantity: 1,
    price: 5_000_000,
    currency: 'KZT',
    executed_at: '2024-01-01',
    transaction_type: 'buy',
  })
  const usdTx = makeTx({
    asset_id: 'h-usd',
    quantity: 10,
    price: 150,
    currency: 'USD',
    executed_at: '2024-01-01',
    transaction_type: 'buy',
  })

  const fxRates: FxRates = {
    'KZT_USD_2024-01-01': 0.00215,
    'USD_USD_2024-01-01': 1,
    'USD_KZT_2024-01-01': 465.12, // not used in these tests but good to include
  }

  it('cost basis sums KZT and USD assets converted to USD display currency', () => {
    const series = computeSeries(
      ['2024-01-01'],
      [kztTx, usdTx],
      [kztAsset, usdAsset],
      {},
      fxRates,
      'USD',
    )

    expect(series).toHaveLength(1)
    const { costBasis } = series[0]
    const kztPart = 5_000_000 * 0.00215  // 10,750
    const usdPart = 10 * 150 * 1         // 1,500
    expect(costBasis).toBeCloseTo(kztPart + usdPart, 2) // 12,250
  })

  it('market value uses live USD price for AAPL and falls back to manual_price for Car', () => {
    const priceHistory: PriceHistory = {
      AAPL: [{ date: '2024-01-01', price: 185 }],
    }
    const series = computeSeries(
      ['2024-01-01'],
      [kztTx, usdTx],
      [kztAsset, usdAsset],
      priceHistory,
      fxRates,
      'USD',
    )

    const { marketValue } = series[0]
    // AAPL: 10 × 185 × fx(USD→USD=1) = 1,850
    // Car: 1 × 5,000,000 (manual_price in KZT) × fx(KZT→USD=0.00215) = 10,750
    expect(marketValue).toBeCloseTo(1_850 + 10_750, 2) // 12,600
  })

  it('display currency KZT: USD asset cost is converted to KZT', () => {
    const kztFxRates: FxRates = {
      'KZT_KZT_2024-01-01': 1,
      'USD_KZT_2024-01-01': 465.12,
    }
    const series = computeSeries(
      ['2024-01-01'],
      [kztTx, usdTx],
      [kztAsset, usdAsset],
      {},
      kztFxRates,
      'KZT',
    )

    const { costBasis } = series[0]
    // KZT asset: 5,000,000 KZT × 1 = 5,000,000
    // USD asset: 10 × 150 USD × 465.12 USD→KZT = 697,680
    expect(costBasis).toBeCloseTo(5_000_000 + 697_680, 0)
  })

  it('series advances over time as transactions accumulate', () => {
    const usdTx2 = makeTx({
      asset_id: 'h-usd',
      quantity: 5,
      price: 160,
      currency: 'USD',
      executed_at: '2024-02-01',
      transaction_type: 'buy',
    })
    const fxWithFeb: FxRates = {
      ...fxRates,
      'KZT_USD_2024-02-01': 0.00215,
      'USD_USD_2024-02-01': 1,
    }
    const series = computeSeries(
      ['2024-01-01', '2024-02-01'],
      [kztTx, usdTx, usdTx2],
      [kztAsset, usdAsset],
      {},
      fxWithFeb,
      'USD',
    )

    expect(series).toHaveLength(2)
    // Jan: 10,750 + 1,500 = 12,250
    expect(series[0].costBasis).toBeCloseTo(12_250, 2)
    // Feb: 12,250 + 5 × 160 = 12,250 + 800 = 13,050
    expect(series[1].costBasis).toBeCloseTo(13_050, 2)
  })
})

// ---------------------------------------------------------------------------
// Scenario 3 — Transaction in third currency (EUR) buying a USD asset
// ---------------------------------------------------------------------------

describe('Scenario 3 — transaction in EUR, asset in USD, display in USD', () => {
  /**
   * Buy 2 shares of TSLA at 100 EUR each.
   * EUR→USD rate: 1.08
   * Asset is denominated in USD.
   * Expected cost basis: 2 × 100 × 1.08 = 216 USD
   */
  const asset = makeAsset({ id: 'h-tsla', symbol: 'TSLA', asset_type: 'stock', currency: 'USD' })
  const tx = makeTx({
    asset_id: 'h-tsla',
    quantity: 2,
    price: 100,
    currency: 'EUR',
    executed_at: '2024-03-15',
    transaction_type: 'buy',
  })
  const fxRates: FxRates = {
    'EUR_USD_2024-03-15': 1.08,
    'USD_USD_2024-03-15': 1,
  }

  it('converts EUR transaction price to USD asset currency then to USD display', () => {
    const series = computeSeries(
      ['2024-03-15'],
      [tx],
      [asset],
      {},
      fxRates,
      'USD',
    )

    expect(series).toHaveLength(1)
    // 2 × (100 EUR × 1.08 EUR→USD) = 216 USD
    expect(series[0].costBasis).toBeCloseTo(216, 4)
  })
})

// ---------------------------------------------------------------------------
// Scenario 4 — Leading zeros trimmed
// ---------------------------------------------------------------------------

describe('Leading zero trimming', () => {
  it('trims leading zero-value points before first transaction', () => {
    const asset = makeAsset({ id: 'h1', currency: 'USD' })
    const tx = makeTx({ asset_id: 'h1', quantity: 1, price: 100, currency: 'USD', executed_at: '2024-01-03' })

    const series = computeSeries(
      ['2024-01-01', '2024-01-02', '2024-01-03'],
      [tx],
      [asset],
      {},
      { 'USD_USD_2024-01-01': 1, 'USD_USD_2024-01-02': 1, 'USD_USD_2024-01-03': 1 },
      'USD',
    )

    // First two points are (0, 0) and should be trimmed
    expect(series[0].date).toBe('2024-01-03')
    expect(series[0].costBasis).toBeCloseTo(100, 4)
  })
})
