# Portfolio Tracker

## Supabase
- **Project ID:** `itdvyquvthxstlybpyrt`
- **URL:** `https://itdvyquvthxstlybpyrt.supabase.co`
- **Service role key:** server/Edge Functions only — never in client code
- **Auth:** always `getUser()` on server, never `getSession()`

### Schema gotchas
- `assets.quantity`, `average_cost_basis`, `total_income_earned` — DB-cached by trigger `trg_asset_cache`. **Never set directly — add transactions instead.**

### Edge Functions
- `fetch-prices` — prices for `{ symbol, asset_type }[]`. jwt: false.
- `lookup-symbol` — `{ symbol, asset_type }` → `{ name, price }`. jwt: false.
- `fetch-fx-rates` — historical FX rates for avg cost basis calculation.

## Git Rules
- **CRITICAL:** Claude MUST NEVER run `git add`, `git commit`, or `git push` unless explicitly asked by the user for a specific task. Always propose changes and ask for confirmation first.