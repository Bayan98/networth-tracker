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
  | 'deposit'
  | 'transport'
  | 'business'
  | 'other'

export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest'
  | 'deposit'
  | 'withdrawal'
  | 'fee'
  | 'split'
  | 'transfer'

export type CurrencyCode = string // ISO 4217 three-letter code

export type DebtType =
  | 'mortgage'
  | 'car_loan'
  | 'student_loan'
  | 'credit_card'
  | 'personal_loan'
  | 'other'

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
  avatar_url: string | null
  default_currency: CurrencyCode
  created_at: string
  updated_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  description: string | null
  base_currency: CurrencyCode
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Holding {
  id: string
  portfolio_id: string | null
  user_id: string
  symbol: string
  asset_name: string
  asset_type: AssetType
  quantity: number
  average_cost_basis: number
  currency: CurrencyCode
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  portfolio_id: string | null
  holding_id: string | null
  symbol: string
  transaction_type: TransactionType
  quantity: number
  price_per_unit: number
  total_amount: number
  fee: number
  currency: CurrencyCode
  executed_at: string
  notes: string | null
  created_at: string
}

export interface Income {
  id: string
  user_id: string
  source: string
  amount: number
  currency: CurrencyCode
  frequency: IncomeFrequency
  is_active: boolean
  start_date: string
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Debt {
  id: string
  user_id: string
  name: string
  debt_type: DebtType
  principal_amount: number
  current_balance: number
  interest_rate: number
  minimum_payment: number
  currency: CurrencyCode
  due_date: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Derived / computed types ─────────────────────────────────────────────────

export interface HoldingWithPrice extends Holding {
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
  holdings_count: number
}

export interface NetWorthSummary {
  total_assets: number
  total_debts: number
  net_worth: number
  currency: CurrencyCode
}

// ─── Supabase DB type helper ──────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      portfolios: { Row: Portfolio; Insert: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Portfolio> }
      holdings: { Row: Holding; Insert: Omit<Holding, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Holding> }
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at'>; Update: Partial<Transaction> }
      income: { Row: Income; Insert: Omit<Income, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Income> }
      debts: { Row: Debt; Insert: Omit<Debt, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Debt> }
    }
    Enums: {
      asset_type: AssetType
      transaction_type: TransactionType
      debt_type: DebtType
      income_frequency: IncomeFrequency
    }
  }
}
