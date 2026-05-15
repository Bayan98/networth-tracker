// ─── Enums ────────────────────────────────────────────────────────────────────

export type AssetType =
  | 'stock'
  | 'bond'
  | 'etf'
  | 'crypto'
  | 'mutual_fund'
  | 'real_estate'
  | 'cash'
  | 'commodity'
  | 'transport'
  | 'business'
  | 'other'

export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'deposit'
  | 'withdrawal'
  | 'split'

export type CurrencyCode = string // ISO 4217 three-letter code
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type IncomeFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'

// ─── Database tables ──────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  default_currency: CurrencyCode
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  description: string | null
  metadata: Json
  created_at: string
}

export interface Asset {
  id: string
  portfolio_id: string | null
  user_id: string
  symbol: string | null
  asset_name: string
  asset_type: AssetType
  currency: CurrencyCode
  notes: string | null
  manual_price: number | null
  manual_price_date: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  asset_id: string | null
  transaction_type: TransactionType
  quantity: number
  price: number
  currency: CurrencyCode
  executed_at: string
  notes: string | null
  metadata: Json
  created_at: string
}

export interface ScheduledEvent {
  id: string
  user_id: string
  name: string
  transaction_type: TransactionType
  amount: number
  amount_type: 'fixed' | 'percent'
  currency: CurrencyCode
  frequency: IncomeFrequency
  asset_id: string | null
  debt_id: string | null
  is_active: boolean
  start_date: string
  end_date: string | null
  last_executed_at: string | null
  notes: string | null
  metadata: Json
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  name: string
  principal_amount: number
  current_balance: number
  interest_rate: number
  minimum_payment: number
  currency: CurrencyCode
  due_date: string | null
  is_active: boolean
  notes: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

// ─── Derived / computed types ─────────────────────────────────────────────────

export interface AssetWithPrice extends Asset {
  current_price: number | null
  current_value: number | null
  gain_loss: number | null
  gain_loss_pct: number | null
}

export interface PortfolioSummary {
  total_value: number
  total_cost: number
  total_gain_loss: number
  total_gain_loss_pct: number
  currency: CurrencyCode
  assets_count: number
}

export interface NetWorthSummary {
  total_assets: number
  total_debts: number
  net_worth: number
  currency: CurrencyCode
}

// ─── Supabase DB type helper ──────────────────────────────────────────────────

type InsertRow<T extends { metadata: Json }, K extends keyof T> = Omit<T, K | 'metadata'> & {
  metadata?: Json
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: InsertRow<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      portfolios: { Row: Portfolio; Insert: InsertRow<Portfolio, 'id' | 'created_at'>; Update: Partial<Portfolio> }
      assets: { Row: Asset; Insert: InsertRow<Asset, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Asset> }
      transactions: { Row: Transaction; Insert: InsertRow<Transaction, 'id' | 'created_at'>; Update: Partial<Transaction> }
      scheduled_events: { Row: ScheduledEvent; Insert: InsertRow<ScheduledEvent, 'id' | 'created_at'>; Update: Partial<ScheduledEvent> }
      debts: { Row: Debt; Insert: InsertRow<Debt, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Debt> }
    }
    Enums: {
      asset_type: AssetType
      transaction_type: TransactionType
      income_frequency: IncomeFrequency
    }
  }
}
