# Portfolio Tracker — CLAUDE.md

## Project overview

Multi-currency portfolio tracker: stocks, crypto, debts, income.
Monorepo: `apps/web` (Next.js 16) + `apps/mobile` (Expo) + shared `packages/`.
Target stack: $0/month on Supabase + Vercel free tier.

System design: https://www.notion.so/Portfolio-Tracker-system-design-31e138b9c1d580859652f580a3cf372c

## Repo structure

```
networth-tracker/
├── apps/
│   ├── web/          # Next.js 16 App Router (Vercel)
│   └── mobile/       # Expo + Expo Router (EAS) — future
├── packages/
│   ├── types/        # TypeScript interfaces, enums
│   ├── ui/           # Shared React components (web-first now)
│   └── utils/        # Formatters, labels, constants
├── supabase/
│   └── functions/    # Edge Functions (Deno)
├── CLAUDE.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Supabase (PostgreSQL 17, Auth, Edge Functions) |
| Web | Next.js 16, App Router, Server Components |
| Hosting | Vercel |
| State | Zustand (UI state only) |
| Styling | Tailwind CSS v4 |
| Monorepo | Turborepo + pnpm workspaces |
| Prices | CoinGecko (crypto) + Finnhub (stocks/ETFs/bonds) |

Note: TanStack Query is installed and the provider is wired up, but not yet adopted. Data fetching uses direct Supabase client calls.

## Supabase

- **Project ID:** `itdvyquvthxstlybpyrt`
- **URL:** `https://itdvyquvthxstlybpyrt.supabase.co`
- **Anon key (JWT):** in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Secret key:** NEVER in client code — server/Edge Functions only

### Database tables (7 active)
`profiles`, `portfolios`, `holdings`, `transactions`, `income`, `debts`, `api_cache`

### Schema notes
- `currency_code`: TEXT (no length constraint enforced in app), supports any ISO 4217 code
- `asset_type` enum values: `stock`, `bond`, `etf`, `crypto`, `mutual_fund`, `real_estate`, `cash`, `commodity`, `deposit`, `transport`, `business`, `other`
- `income_frequency` enum values: `daily`, `weekly`, `monthly`, `quarterly`, `annually`
- `holdings.portfolio_id`: nullable — holdings can exist without a portfolio
- `transactions.portfolio_id`: nullable — transactions can be linked to a holding without a portfolio
- Deleting a portfolio sets `portfolio_id = NULL` on related holdings/transactions (ON DELETE SET NULL)

### Edge Functions
- `fetch-prices`: fetches current prices for a list of `{ symbol, asset_type }` items. Priceable types: `stock`, `etf`, `bond`, `mutual_fund`, `commodity`, `crypto`. `verify_jwt: false` (public price data).
- `lookup-symbol`: given `{ symbol, asset_type }`, returns `{ name, price }`. Used for auto-fill in add/edit holding dialogs. `verify_jwt: false`.
- Both functions use the service role key internally for caching in `api_cache`. Results cached: 3600s for name lookups, 60s for prices.

### Key rules
- Always use `@supabase/ssr` on web (not deprecated auth-helpers)
- Server: always `getUser()`, never `getSession()` (security)
- RLS: wrap `auth.uid()` in `(select auth.uid())` for initPlan caching
- Service role key: server-only, never exposed to client

## Next.js App Router

### Route structure
```
apps/web/app/
├── layout.tsx              # Root: providers, fonts
├── page.tsx                # Landing → redirect to /dashboard
├── middleware.ts            # Auth guard + token refresh
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
└── dashboard/
    ├── layout.tsx          # Auth check, sidebar + header + mobile nav
    ├── page.tsx            # Dashboard: net worth stats, charts, holdings list
    ├── portfolio/
    │   ├── page.tsx        # Holdings list with filters
    │   └── [holdingId]/page.tsx  # Holding detail + transaction history
    ├── transactions/page.tsx
    ├── income/page.tsx
    ├── debts/page.tsx
    └── settings/page.tsx
```

### Server vs Client components
- **Default:** Server Component — all pages fetch data server-side
- **'use client'** only for: charts (recharts), forms, filters, toggles, interactive tables
- Server Components use `createClient()` from `@/lib/supabase/server`
- Client Components use `createClient()` from `@/lib/supabase/client` for mutations

### Data flow
- **Reads:** Server Components → Supabase server client → pass data as props to Client Components
- **Mutations:** Client Components → `supabase.from(...).insert/update/delete()` → `router.refresh()` to re-fetch

### Revalidation
| Data | Strategy |
|------|---------|
| Holdings/portfolios | `revalidate = 300`, `router.refresh()` after mutations |
| Prices | `usePrices` hook polls every 60s |
| Transactions | `router.refresh()` after mutations |

## State management (Zustand)

Zustand store at `apps/web/lib/store.ts`:
- `selectedCurrency` — display currency for all amounts
- `hideAmounts` — toggle to mask all financial values
- `theme` — light/dark (future)

State persisted to `localStorage` via `partialize`.

## UI / Layout

- **Desktop:** fixed sidebar (`w-60`) + header
- **Mobile:** sidebar hidden, bottom tab bar (`MobileNav` component) with 6 items
- Tables hide non-essential columns on small screens (`hidden sm:table-cell`, `hidden md:table-cell`)
- Action buttons (edit/delete) always visible on mobile (no hover-only opacity trick on touch)

## Currencies & prices

- Supported: any ISO 4217 currency (full list via `currency-codes` npm package)
- Popular defaults shown first: USD, EUR, GBP, RUB, KZT, CNY, JPY, CHF, CAD, AUD
- `CurrencyCode = string` — open type, not restricted to a union
- `CurrencyPicker` component: searchable dropdown at `apps/web/components/ui/currency-picker.tsx`
- Crypto prices → CoinGecko (free, no key)
- Stock/ETF/bond prices → Finnhub (`FINNHUB_API_KEY` Supabase secret)
- All external API calls go through Supabase Edge Function `fetch-prices` (proxy + cache)

## Security rules

1. Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
2. Always `getUser()` on server, never `getSession()`
3. RLS on every user-owned table with `(select auth.uid()) = user_id`
4. `.eq('user_id', userId)` in queries for index leverage
5. `SECURITY DEFINER` + `SET search_path = ''` on sensitive DB functions
6. Edge Functions that handle public data (prices) use `verify_jwt: false`

## Environment variables

### apps/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://itdvyquvthxstlybpyrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<secret — never commit>
```

### Supabase secrets (set via dashboard or CLI)
```
FINNHUB_API_KEY=<finnhub API key>
```

## Development commands

```bash
# Install
pnpm install

# Dev (web only)
pnpm dev --filter=web

# Build
pnpm build --filter=web

# Typecheck all
pnpm typecheck

# Lint all
pnpm lint
```

## Coding conventions

- TypeScript strict mode everywhere
- No `any` — use proper types from `packages/types`
- Prefer `async/await` over `.then()`
- Direct Supabase client calls for mutations (not Server Actions)
- Always handle Supabase errors: check `error` and show to user or throw
- Format numbers with `formatCurrency(amount, currency)` from `@networth/utils`
- Use `MaskedAmount` component or `hideAmounts` store flag to respect privacy mode
- Use English for everything in the project (code, comments, docs, UI copy, commits)

## When updating system design

If architecture decisions change, update the Notion page at:
https://www.notion.so/Portfolio-Tracker-system-design-31e138b9c1d580859652f580a3cf372c

## Keeping CLAUDE.md up to date

Whenever a change affects information documented in CLAUDE.md — tech stack, route structure, removed features, new env vars, DB schema, edge functions, etc. — update CLAUDE.md in the same commit.
