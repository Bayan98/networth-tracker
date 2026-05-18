import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In — Networth Tracker',
}

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Networth overview">
        <div className="auth-brand">
          <div className="auth-mark">N</div>
          <div className="auth-wordmark">Networth</div>
        </div>

        <div className="auth-hero-copy">
          <div className="auth-kicker">Private ledger</div>
          <h1>Your money at a glance.</h1>
          <p>Track assets, cash, investments, and liabilities in one quiet workspace.</p>
        </div>

        <div className="auth-ledger" aria-hidden="true">
          <div className="auth-ledger-head">
            <span>Portfolio</span>
            <span>Today</span>
          </div>
          <div className="auth-ledger-value">$225,937<span>.19</span></div>
          <div className="auth-ledger-chart">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="auth-ledger-row">
            <span>Stocks</span>
            <strong>52.4%</strong>
          </div>
          <div className="auth-ledger-row">
            <span>Cash</span>
            <strong>14.0%</strong>
          </div>
          <div className="auth-ledger-row">
            <span>Real estate</span>
            <strong>9.7%</strong>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <div className="auth-kicker">Sign in</div>
            <h2>Welcome back.</h2>
            <p>Use your account email and password to open your workspace.</p>
          </div>

          <LoginForm />

          <p className="auth-alt">
            No account? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
