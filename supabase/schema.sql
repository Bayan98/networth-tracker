-- Enums
CREATE TYPE public.asset_type AS ENUM (
  'stock', 'bond', 'etf', 'crypto', 'mutual_fund',
  'real_estate', 'cash', 'commodity', 'other',
  'transport', 'business'
);

CREATE TYPE public.transaction_type AS ENUM (
  'buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'split'
);

CREATE TYPE public.income_frequency AS ENUM (
  'daily', 'weekly', 'monthly', 'quarterly', 'annually'
);

CREATE TYPE public.scheduled_event_amount_type AS ENUM (
  'fixed', 'percent'
);

-- Tables

CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id),
  email        text,
  full_name    text,
  default_currency text NOT NULL DEFAULT 'USD' CHECK (char_length(default_currency) = 3),
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.portfolios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id),
  name        text NOT NULL,
  description text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- assets: quantity and avg_cost_basis are NOT stored; computed from transactions at query time.
CREATE TABLE public.assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id      uuid REFERENCES public.portfolios(id),
  user_id           uuid NOT NULL REFERENCES public.profiles(id),
  symbol            text,
  asset_name        text NOT NULL,
  asset_type        asset_type NOT NULL DEFAULT 'stock',
  currency          text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  notes             text,
  manual_price      numeric,
  manual_price_date date,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, symbol)
);

CREATE TABLE public.transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id),
  asset_id         uuid REFERENCES public.assets(id),
  transaction_type transaction_type NOT NULL,
  quantity         numeric NOT NULL,
  price            numeric NOT NULL,
  currency         text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  executed_at      timestamptz NOT NULL DEFAULT now(),
  notes            text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.debts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  name            text NOT NULL,
  principal_amount numeric NOT NULL,
  current_balance  numeric NOT NULL,
  interest_rate    numeric NOT NULL DEFAULT 0,
  minimum_payment  numeric NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  due_date         date,
  is_active        boolean NOT NULL DEFAULT true,
  notes            text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scheduled_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id),
  name             text NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount           numeric NOT NULL,
  amount_type      scheduled_event_amount_type NOT NULL DEFAULT 'fixed',
  currency         text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  frequency        income_frequency NOT NULL DEFAULT 'monthly',
  asset_id         uuid REFERENCES public.assets(id),
  debt_id          uuid REFERENCES public.debts(id),
  is_active        boolean NOT NULL DEFAULT true,
  start_date       date NOT NULL DEFAULT CURRENT_DATE,
  end_date         date,
  last_executed_at timestamptz,
  notes            text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.api_cache (
  cache_key  text PRIMARY KEY,
  response   jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Indexes

CREATE INDEX idx_portfolios_user_id       ON public.portfolios (user_id);
CREATE INDEX idx_holdings_user_id         ON public.assets (user_id);
CREATE INDEX idx_holdings_portfolio_id    ON public.assets (portfolio_id);
CREATE INDEX idx_holdings_symbol          ON public.assets (symbol);
CREATE INDEX idx_transactions_user_id     ON public.transactions (user_id);
CREATE INDEX idx_transactions_executed_at ON public.transactions (executed_at DESC);
CREATE INDEX idx_debts_user_id            ON public.debts (user_id);
CREATE INDEX idx_profiles_email           ON public.profiles (email);
CREATE INDEX idx_api_cache_updated        ON public.api_cache (updated_at);

-- Row Level Security (all tables: users can only access their own rows)

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cache         ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- portfolios
CREATE POLICY "Users can view own portfolios"   ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

-- assets
CREATE POLICY "Users can view own holdings"   ON public.assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holdings" ON public.assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holdings" ON public.assets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own holdings" ON public.assets FOR DELETE USING (auth.uid() = user_id);

-- transactions
CREATE POLICY "Users can view own transactions"   ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- debts
CREATE POLICY "Users can view own debts"   ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debts" ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debts" ON public.debts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own debts" ON public.debts FOR DELETE USING (auth.uid() = user_id);

-- scheduled_events
CREATE POLICY "Users manage own scheduled_events" ON public.scheduled_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
