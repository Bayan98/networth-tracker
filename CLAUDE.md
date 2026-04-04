# Portfolio Tracker — CLAUDE.md

## Project overview

Multi-currency portfolio tracker: stocks, crypto, debts, income, emergency fund.
Monorepo: `apps/web` (Next.js 15) + `apps/mobile` (Expo) + shared `packages/`.
Target stack: $0/month on Supabase + Vercel free tier.

System design: https://www.notion.so/Portfolio-Tracker-system-design-31e138b9c1d580859652f580a3cf372c

## Repo structure

```
networth-tracker/
├── apps/
│   ├── web/          # Next.js 15 App Router (Vercel)
│   └── mobile/       # Expo + Expo Router (EAS) — future
├── packages/
│   ├── types/        # TypeScript interfaces, enums
│   ├── ui/           # Shared React components (web-first now)
│   └── utils/        # API client, formatters, validators
├── supabase/
│   └── migrations/   # SQL migration files
├── CLAUDE.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Supabase (PostgreSQL 17, Auth, Realtime, Edge Functions) |
| Web | Next.js 15, App Router, Server Components, Server Actions |
| Hosting | Vercel |
| State | TanStack Query v5 (server) + Zustand (UI) |
| Styling | Tailwind CSS v4 |
| Monorepo | Turborepo + pnpm workspaces |
| Prices | CoinGecko (crypto) + Finnhub (stocks) + NBRK (KZT) |

## Supabase

- **Project ID:** `itdvyquvthxstlybpyrt`
- **URL:** `https://itdvyquvthxstlybpyrt.supabase.co`
- **Anon key (JWT):** in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Publishable key:** in `.env.local` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Secret key:** NEVER in client code — server/Edge Functions only

### Database tables (9)
`profiles`, `portfolios`, `holdings`, `transactions`, `price_history`, `income`, `debts`, `emergency_fund`, `api_cache`

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
└── (dashboard)/
    ├── layout.tsx          # Sidebar + header
    ├── page.tsx            # Dashboard: net worth, charts
    ├── portfolio/
    │   └── [holdingId]/page.tsx
    ├── transactions/page.tsx
    ├── income/page.tsx
    ├── debts/page.tsx
    └── settings/page.tsx
```

### Server vs Client components
- **Default:** Server Component
- **'use client'** only for: charts (recharts), Realtime tickers, forms, filters, toggles
- Data fetching in Server Components via Supabase server client
- Mutations via **Server Actions** (no API routes for CRUD)

### Revalidation strategy
| Data | Strategy |
|------|---------|
| Portfolio summary | `revalidate = 300` + on-demand tags |
| Asset prices | Client Component + Supabase Realtime |
| Transactions | On-demand via `revalidatePath` |
| Settings | Static |

## State management

- **TanStack Query v5** — all server state (holdings, prices, transactions)
- **Zustand** — UI state: `selectedCurrency`, `theme`, `hideAmounts`, `assetTypeFilter`
- Zustand state persisted to `localStorage` via `partialize`

### Query key factories
```ts
portfolioKeys.all / .lists() / .detail(id)
holdingKeys.all / .byPortfolio(pid)
priceKeys.crypto(ids) / .stock(syms) / .exchangeRate(from, to)
transactionKeys.byPortfolio(pid)
```

## Currencies & prices

- Supported: USD, RUB, KZT, EUR, GBP
- Crypto → CoinGecko (30 calls/min free)
- Stocks → Finnhub (60 calls/min free)
- KZT rate → NBRK XML API (daily, free)
- Conversion chain: source → USD → multiply by KZT/USD rate from NBRK
- All external API calls go through Supabase Edge Function `fetch-prices` (proxy + cache)
- Cache TTL: crypto 60s, stocks 60s, FX 3600s

## Security rules

1. Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
2. Always `getUser()` on server, never `getSession()`
3. RLS on every user-owned table with `(select auth.uid()) = user_id`
4. `.eq('user_id', userId)` in queries for index leverage
5. `SECURITY DEFINER` + `SET search_path = ''` on sensitive DB functions

## Environment variables

### apps/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<secret — never commit>
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
- Server Actions for mutations, not API routes
- Always handle Supabase errors: `if (error) throw error`
- Format numbers with `Intl.NumberFormat` using user's `selectedCurrency`
- `MaskedAmount` component for "hide amounts" mode
- Use English for everything in the project (code comments, docs, UI copy, commit messages, and PR descriptions)

## When updating system design

If architecture decisions change, update the Notion page at:
https://www.notion.so/Portfolio-Tracker-system-design-31e138b9c1d580859652f580a3cf372c
