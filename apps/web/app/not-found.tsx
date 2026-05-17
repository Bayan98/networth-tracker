import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-code">404</div>
        <div className="auth-kicker">Missing page</div>
        <h1 id="not-found-title">
          This page is <em>off ledger.</em>
        </h1>
        <p>
          The route may have moved, or the address is no longer part of this workspace.
        </p>
        <div className="not-found-actions">
          <Link className="btn btn-primary" href="/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-secondary" href="/assets">
            Assets
          </Link>
        </div>
      </section>
    </main>
  )
}
