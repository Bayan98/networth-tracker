<div align="center">

<h1>Networth Tracker</h1>

<p>
  <strong>A modern, self-hostable portfolio &amp; net-worth tracker.</strong><br/>
  Track assets, debts, income, and scheduled events across currencies &mdash; with live prices, historical performance, and a clean, responsive UI.
</p>

<p>
  <img alt="Next.js"     src="https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white"/>
  <img alt="React"       src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white"/>
  <img alt="TypeScript"  src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white"/>
  <img alt="Supabase"    src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Edge-3ECF8E?logo=supabase&logoColor=white"/>
  <img alt="Tailwind"    src="https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss&logoColor=white"/>
  <img alt="Turborepo"   src="https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo&logoColor=white"/>
  <img alt="pnpm"        src="https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white"/>
  <img alt="License"     src="https://img.shields.io/badge/license-MIT-blue"/>
</p>

<sub>Built with Next.js App Router, Supabase, Deno Edge Functions, and Recharts.</sub>

</div>

<br/>

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>What it does</h3>
      <ul>
        <li>Track stocks, ETFs, crypto, bonds, cash, real estate and more</li>
        <li>Live prices, dividends, splits and corporate actions auto-applied</li>
        <li>Historical FX-aware valuation across multiple currencies</li>
        <li>Portfolios, debts, income streams and scheduled cashflow events</li>
        <li>Interactive net-worth charts with selectable time ranges</li>
        <li>Mobile-first layout with a polished design system</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>Why it exists</h3>
      <p>
        Existing trackers either lock your data away, ignore non-stock assets,
        or treat FX and dividends as an afterthought. <strong>Networth Tracker</strong>
        is an open, end-to-end view of personal wealth &mdash; with the math done
        correctly, your data in your own Supabase project, and a UI you actually
        want to open.
      </p>
    </td>
  </tr>
</table>

<br/>

<div align="center">
  <h2>Tech Stack</h2>
</div>

<table>
  <tr>
    <th align="left">Layer</th>
    <th align="left">Tooling</th>
  </tr>
  <tr>
    <td><strong>Web app</strong></td>
    <td>Next.js 16 (App Router, Turbopack) &middot; React 19 &middot; TypeScript 5</td>
  </tr>
  <tr>
    <td><strong>UI</strong></td>
    <td>Tailwind CSS 4 &middot; Recharts &middot; Lucide icons &middot; custom design tokens</td>
  </tr>
  <tr>
    <td><strong>State</strong></td>
    <td>Zustand &middot; Supabase SSR client</td>
  </tr>
  <tr>
    <td><strong>Backend</strong></td>
    <td>Supabase Postgres &middot; Row Level Security &middot; Deno Edge Functions</td>
  </tr>
  <tr>
    <td><strong>Pricing</strong></td>
    <td>Yahoo Finance &middot; Finnhub &middot; historical FX rates</td>
  </tr>
  <tr>
    <td><strong>Tooling</strong></td>
    <td>pnpm workspaces &middot; Turborepo &middot; ESLint &middot; Prettier &middot; Deno test</td>
  </tr>
  <tr>
    <td><strong>Hosting</strong></td>
    <td>Vercel (web) &middot; Supabase (db + functions)</td>
  </tr>
</table>

<br/>

<div align="center">
  <h2>Repository Layout</h2>
</div>

```text
networth-tracker/
├── apps/
│   └── web/                  Next.js App Router frontend
│       ├── app/              Routes: dashboard, assets, debts, income, settings, ...
│       ├── components/       Feature modules: assets, charts, dashboard, debts, ...
│       └── styles/global/    Design tokens, primitives, shell, patterns
├── packages/
│   ├── types/                Shared TypeScript types
│   └── utils/                Valuation, FX, portfolio-series, shared helpers
├── supabase/
│   ├── functions/            Deno Edge Functions (prices, FX, symbol lookup, news, ...)
│   └── migrations/           Postgres schema + RLS policies
└── turbo.json                Turborepo pipeline
```

<br/>

<div align="center">
  <h2>Edge Functions</h2>
</div>

<table>
  <tr><th align="left">Function</th><th align="left">Purpose</th></tr>
  <tr><td><code>fetch-prices</code></td><td>Batch quotes for <code>{ symbol, asset_type }</code> pairs</td></tr>
  <tr><td><code>lookup-symbol</code></td><td>Resolve a ticker to <code>{ name, price }</code></td></tr>
  <tr><td><code>search-symbols</code></td><td>Autocomplete search across markets</td></tr>
  <tr><td><code>fetch-price-history</code></td><td>Historical OHLC for charting</td></tr>
  <tr><td><code>fetch-price-at-date</code></td><td>Spot price for a single past date</td></tr>
  <tr><td><code>fetch-corporate-actions</code></td><td>Dividends and splits auto-import</td></tr>
  <tr><td><code>fetch-fx-rates</code></td><td>Historical FX for accurate cost basis</td></tr>
  <tr><td><code>fetch-asset-info</code></td><td>Company metadata and fundamentals</td></tr>
  <tr><td><code>fetch-asset-news</code></td><td>Latest news for a holding</td></tr>
  <tr><td><code>fetch-logo</code></td><td>Asset/issuer logos</td></tr>
</table>

<br/>

<div align="center">
  <h2>Getting Started</h2>
</div>

<h4>1. Prerequisites</h4>

<ul>
  <li>Node.js &ge; 20</li>
  <li>pnpm &ge; 9</li>
  <li><a href="https://supabase.com/docs/guides/local-development/cli/getting-started">Supabase CLI</a></li>
  <li><a href="https://deno.land/">Deno</a> (for running and testing Edge Functions)</li>
  <li>A Supabase project (free tier is enough)</li>
  <li>A <a href="https://finnhub.io/">Finnhub</a> API key (used by price/news Edge Functions)</li>
</ul>

<h4>2. Install</h4>

```bash
pnpm install
```

<h4>3. Provision the Supabase backend</h4>

Link the repository to your Supabase project, then apply the schema and deploy
the Edge Functions. The schema includes <strong>enums</strong>
(<code>asset_type</code>, <code>transaction_type</code>,
<code>income_frequency</code>, <code>scheduled_event_amount_type</code>),
<strong>tables</strong> (profiles, portfolios, assets, transactions, debts,
scheduled events), and <strong>Row Level Security</strong> policies.

```bash
# Log in and link to your project
supabase login
supabase link --project-ref <your-project-ref>

# Apply the database schema
#   Option A — load the full schema (fresh project)
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
#   Option B — apply incremental migrations
supabase db push
```

Deploy every Edge Function in <code>supabase/functions</code>:

```bash
supabase functions deploy fetch-prices            --no-verify-jwt
supabase functions deploy lookup-symbol           --no-verify-jwt
supabase functions deploy search-symbols          --no-verify-jwt
supabase functions deploy fetch-price-history     --no-verify-jwt
supabase functions deploy fetch-price-at-date     --no-verify-jwt
supabase functions deploy fetch-corporate-actions --no-verify-jwt
supabase functions deploy fetch-fx-rates          --no-verify-jwt
supabase functions deploy fetch-asset-info        --no-verify-jwt
supabase functions deploy fetch-asset-news        --no-verify-jwt
supabase functions deploy fetch-logo              --no-verify-jwt
```

Set the secrets the functions need at runtime:

```bash
supabase secrets set FINNHUB_API_KEY=<your-finnhub-key>
```

<h4>4. Configure the web app</h4>

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — server only>
```

<h4>5. Run the app</h4>

```bash
pnpm dev
```

The web app is served at <a href="http://localhost:3000">http://localhost:3000</a>.

<details>
  <summary><strong>Schema overview</strong></summary>
  <br/>
  <table>
    <tr><th align="left">Object</th><th align="left">Purpose</th></tr>
    <tr><td><code>profiles</code></td><td>User profile, default currency, metadata</td></tr>
    <tr><td><code>portfolios</code></td><td>Optional grouping of assets per user</td></tr>
    <tr><td><code>assets</code></td><td>Holdings (stock, crypto, cash, real estate, ...)</td></tr>
    <tr><td><code>transactions</code></td><td>Buy / sell / dividend / split / deposit / withdrawal</td></tr>
    <tr><td><code>debts</code></td><td>Loans, mortgages, credit lines</td></tr>
    <tr><td><code>scheduled_events</code></td><td>Recurring income streams and future cashflow events (fixed or percent)</td></tr>
  </table>
  <p>All user-scoped tables are protected by Row Level Security &mdash; every row is owned by an <code>auth.users</code> id and only readable/writable by that user.</p>
</details>

<br/>

<div align="center">
  <h2>Scripts</h2>
</div>

<table>
  <tr><th align="left">Command</th><th align="left">Description</th></tr>
  <tr><td><code>pnpm dev</code></td><td>Start the Next.js dev server (Turbopack)</td></tr>
  <tr><td><code>pnpm build</code></td><td>Build all workspace packages</td></tr>
  <tr><td><code>pnpm lint</code></td><td>Lint every workspace</td></tr>
  <tr><td><code>pnpm typecheck</code></td><td>Run <code>tsc --noEmit</code> across the monorepo</td></tr>
  <tr><td><code>pnpm test</code></td><td>Build, lint, typecheck, unit and integration tests</td></tr>
  <tr><td><code>pnpm test:unit</code></td><td>Unit tests for <code>@networth/utils</code></td></tr>
  <tr><td><code>pnpm test:integration</code></td><td>Deno integration tests for Edge Functions</td></tr>
  <tr><td><code>pnpm format</code></td><td>Format with Prettier</td></tr>
</table>

<br/>

<div align="center">
  <h2>Domain Model</h2>
</div>

<details>
  <summary><strong>Asset types</strong></summary>
  <br/>
  <code>stock</code> &middot; <code>bond</code> &middot; <code>etf</code> &middot; <code>crypto</code> &middot; <code>mutual_fund</code>
  &middot; <code>real_estate</code> &middot; <code>cash</code> &middot; <code>commodity</code> &middot;
  <code>transport</code> &middot; <code>business</code> &middot; <code>other</code>
  <p>Bank deposits are modelled as <code>cash</code> assets &mdash; there is no separate deposit type.</p>
</details>

<details>
  <summary><strong>Transaction types</strong></summary>
  <br/>
  <code>buy</code> &middot; <code>sell</code> &middot; <code>dividend</code> &middot; <code>deposit</code> &middot; <code>withdrawal</code> &middot; <code>split</code>
</details>

<details>
  <summary><strong>Computed fields</strong></summary>
  <br/>
  <p>
    Asset <strong>quantity</strong> and <strong>average cost basis</strong> are derived from the
    transaction history at query time &mdash; never stored on the asset row. This keeps history
    the single source of truth and makes corporate actions (splits, dividends) consistent across
    every view.
  </p>
</details>

<details>
  <summary><strong>Pricing priority</strong></summary>
  <br/>
  <p>Holding valuation uses the first available source, in order:</p>
  <ol>
    <li><strong>Manual</strong> &mdash; user-overridden price</li>
    <li><strong>Live</strong> &mdash; latest fetched market price</li>
    <li><strong>Cost basis</strong> &mdash; fallback when no quote exists</li>
  </ol>
</details>

<br/>

<div align="center">
  <h2>Project Status</h2>
  <sub>Actively developed &middot; expect frequent UI iteration &middot; data model is stable.</sub>
</div>

<br/>

<div align="center">
  <h2>License</h2>
  <p>Released under the <a href="./LICENSE">MIT License</a>.</p>
</div>
