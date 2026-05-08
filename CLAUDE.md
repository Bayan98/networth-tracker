# Portfolio Tracker
- Use English for everything in the project
- Use comments only when really needed
- Always finish code, don't leave TODOs or comments

## Verification
- After code edits, run `pnpm test` before reporting completion.
- Do not claim work is verified unless `pnpm test` passes.
- If `pnpm test` fails, report the failing command and the relevant error summary.
- If only documentation or comments changed, you may skip `pnpm test`, but state that it was skipped and why.
- For Supabase Edge Function changes, run `pnpm test` before deploying; deployment is a separate step.

## Codebase Search (SocratiCode)
This project is indexed with SocratiCode. Always use codebase_search 
before reading any files directly. Search first to find relevant files, 
then read only those files. Never open files speculatively.

## Supabase
- **Project ID:** `itdvyquvthxstlybpyrt`
- **URL:** `https://itdvyquvthxstlybpyrt.supabase.co`
- **Service role key:** server/Edge Functions only — never in client code
- **Auth:** always `getUser()` on server, never `getSession()`
- Always handle Supabase errors: check `error` and show to user or throw

## Enums
- transaction_type - buy, sell, dividend, deposit, withdrawal, split
- scheduled_event_amount_type - fixed, percent

### Schema gotchas
- Asset quantity and avg cost basis are computed from transactions at query time — never stored on `assets`.

### Edge Functions
- `fetch-prices` — prices for `{ symbol, asset_type }[]`. jwt: false.
- `lookup-symbol` — `{ symbol, asset_type }` → `{ name, price }`. jwt: false.
- `fetch-fx-rates` — historical FX rates for avg cost basis calculation.

## Environment variables

### apps/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://itdvyquvthxstlybpyrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<secret — never commit>
```
