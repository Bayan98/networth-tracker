// ─── Asset type → display color ───────────────────────────────────────────────

export const ASSET_TYPE_COLOR: Record<string, string> = {
  stock:       'var(--cat-stocks)',
  etf:         'var(--cat-stocks)',
  mutual_fund: 'var(--cat-stocks)',
  bond:        'var(--cat-stocks)',
  crypto:      'var(--cat-crypto)',
  cash:        'var(--cat-cash)',
  deposit:     'var(--cat-cash)',
  real_estate: 'var(--cat-real)',
  commodity:   'var(--cat-other)',
  transport:   'var(--cat-other)',
  business:    'var(--cat-other)',
  other:       'var(--cat-other)',
}

// ─── Sequential palette for unlabelled groupings (portfolio, currency, country) ─

export const PALETTE = [
  'var(--cat-stocks)',
  'var(--cat-crypto)',
  'var(--cat-cash)',
  'var(--cat-real)',
  'var(--cat-other)',
  'oklch(55% 0.12 310)',
  'oklch(52% 0.11 200)',
  'oklch(58% 0.09 40)',
]

// ─── Liquidity tiers ──────────────────────────────────────────────────────────

export const ASSET_TYPE_LIQUIDITY: Record<string, string> = {
  stock:       'High',
  etf:         'High',
  crypto:      'High',
  cash:        'High',
  bond:        'Medium',
  mutual_fund: 'Medium',
  deposit:     'Medium',
  commodity:   'Medium',
  real_estate: 'Low',
  transport:   'Low',
  business:    'Low',
  other:       'Low',
}

export const LIQUIDITY_COLOR: Record<string, string> = {
  High:   'var(--pos)',
  Medium: 'var(--warn)',
  Low:    'var(--neg)',
}

// ─── Sector groupings (derived from asset_type) ────────────────────────────────

export const ASSET_TYPE_SECTOR: Record<string, string> = {
  stock:       'Equities',
  etf:         'Funds',
  mutual_fund: 'Funds',
  bond:        'Fixed Income',
  crypto:      'Digital Assets',
  cash:        'Cash & Equivalents',
  deposit:     'Cash & Equivalents',
  real_estate: 'Real Estate',
  commodity:   'Commodities',
  transport:   'Other',
  business:    'Other',
  other:       'Other',
}

export const SECTOR_COLOR: Record<string, string> = {
  'Equities':          'var(--cat-stocks)',
  'Funds':             'oklch(55% 0.12 310)',
  'Fixed Income':      'oklch(52% 0.11 200)',
  'Digital Assets':    'var(--cat-crypto)',
  'Cash & Equivalents':'var(--cat-cash)',
  'Real Estate':       'var(--cat-real)',
  'Commodities':       'oklch(58% 0.09 40)',
  'Other':             'var(--cat-other)',
}

// ─── Country derived from ISO 4217 currency code ──────────────────────────────

export const CURRENCY_COUNTRY: Record<string, string> = {
  USD: 'United States',
  EUR: 'Europe',
  GBP: 'United Kingdom',
  JPY: 'Japan',
  CHF: 'Switzerland',
  CAD: 'Canada',
  AUD: 'Australia',
  NZD: 'New Zealand',
  SGD: 'Singapore',
  HKD: 'Hong Kong',
  CNY: 'China',
  KRW: 'South Korea',
  INR: 'India',
  BRL: 'Brazil',
  MXN: 'Mexico',
  TRY: 'Turkey',
  KZT: 'Kazakhstan',
  RUB: 'Russia',
  AED: 'UAE',
  SAR: 'Saudi Arabia',
  NOK: 'Norway',
  SEK: 'Sweden',
  DKK: 'Denmark',
  PLN: 'Poland',
  CZK: 'Czech Republic',
  HUF: 'Hungary',
  ZAR: 'South Africa',
  ILS: 'Israel',
  QAR: 'Qatar',
  MYR: 'Malaysia',
  THB: 'Thailand',
  IDR: 'Indonesia',
  PHP: 'Philippines',
  TWD: 'Taiwan',
}

// ─── Font CSS variables (defined in globals.css / layout.tsx) ─────────────────

export const FONTS = {
  sans:    'var(--font-sans)',
  display: 'var(--font-display)',
  mono:    'var(--font-mono)',
} as const
