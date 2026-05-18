'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { deleteAllUserData } from '@/app/(main)/settings/actions'
import type { Accent, Density } from '@/lib/store'
import type { Profile, CurrencyCode } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

interface Props {
  profile: Profile | null
  userEmail: string
}

const ACCENT_SWATCHES: { key: Accent; light: string }[] = [
  { key: 'moss', light: '#2F4A2B' },
  { key: 'indigo', light: '#3F4D63' },
  { key: 'amber', light: '#8A6A14' },
  { key: 'rose', light: '#7A2E2A' },
  { key: 'graphite', light: '#2E2A24' },
]

function Segmented<T extends string>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="ds-segmented">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={value === o ? 'active' : ''}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function SettingsClient({ profile, userEmail }: Props) {
  const router = useRouter()
  const { theme, setTheme, density, setDensity, accent, setAccent, hideAmounts, toggleHideAmounts } = useAppStore()
  const accentValue = accent as Accent | 'evergreen'
  const selectedAccent = accentValue === 'evergreen' ? 'moss' : accentValue
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(
    profile?.default_currency ?? 'USD',
  )
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, default_currency: defaultCurrency })
      .eq('id', profile!.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    setLoggingOut(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      setLoggingOut(false)
      return
    }

    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <section className="card settings-profile-card">
        <header className="ds-section-head">
          <h2 className="ds-section-title">Profile &amp; identity</h2>
          <span className="ds-section-meta">Account · currency</span>
        </header>

        <form onSubmit={handleSave} className="settings-profile-form">
          <div className="settings-profile-grid">
            <div className="settings-profile-field">
              <div className="ds-field-label">Full name</div>
              <input
                className="ds-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Smith"
              />
            </div>
            <div className="settings-profile-field">
              <div className="ds-field-label">Email</div>
              <input className="ds-field" value={userEmail} disabled />
            </div>
            <div className="settings-profile-field">
              <div className="ds-field-label">Default currency</div>
              <CurrencyPicker
                value={defaultCurrency}
                onChange={(c) => setDefaultCurrency(c as CurrencyCode)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--ink)',
                  borderRadius: 'var(--radius)',
                  padding: '9px 12px',
                  fontSize: 13,
                  width: '100%',
                  fontFamily: 'var(--font-sans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  outline: 'none',
                }}
              />
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: 'var(--neg)' }}>{error}</p>}
          <div className="settings-profile-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: 13 }}
            >
              {loading ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={loggingOut}
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ fontSize: 13 }}
            >
              <LogOut size={14} />
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <header className="ds-section-head">
          <h2 className="ds-section-title">Appearance &amp; tone</h2>
          <span className="ds-section-meta">Theme · density · accent</span>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="appearance-grid">
          <div>
            <div className="ds-field-label">Theme</div>
            <Segmented<'light' | 'dark' | 'system'>
              options={['light', 'dark', 'system']}
              value={theme}
              onChange={setTheme}
            />
          </div>
          <div>
            <div className="ds-field-label">Density</div>
            <Segmented<Density>
              options={['compact', 'cozy', 'spacious']}
              value={density}
              onChange={setDensity}
            />
          </div>
          <div>
            <div className="ds-field-label">Accent</div>
            <div className="ds-swatch-row">
              {ACCENT_SWATCHES.map(({ key, light }) => (
                <button
                  key={key}
                  type="button"
                  title={key}
                  onClick={() => setAccent(key)}
                  aria-pressed={selectedAccent === key}
                  className={`ds-swatch ${selectedAccent === key ? 'active' : ''}`}
                  style={{ background: light }}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Hide amounts</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
              Mask financial figures for privacy
            </div>
          </div>
          <button
            role="switch"
            aria-checked={hideAmounts}
            onClick={toggleHideAmounts}
            className={`ds-switch ${hideAmounts ? 'on' : ''}`}
          />
        </div>
      </section>
    </div>
  )
}

export function DangerZone() {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDeleteAll() {
    const confirmed = prompt('Type DELETE ALL to permanently delete all portfolio data.')
    if (confirmed !== 'DELETE ALL') return

    setDeleting(true)
    setError(null)
    const result = await deleteAllUserData()
    setDeleting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.refresh()
  }

  return (
    <section
      className="card"
      style={{
        border: '1px solid color-mix(in oklch, var(--color-danger) 48%, var(--border))',
        background: 'linear-gradient(180deg, color-mix(in oklch, var(--color-danger) 6%, var(--surface)) 0%, var(--surface) 42%)',
      }}
    >
      <header
        className="ds-section-head"
        style={{ borderBottom: '1px solid color-mix(in oklch, var(--color-danger) 60%, var(--border))' }}
      >
        <h2 className="ds-section-title" style={{ color: 'var(--color-danger)' }}>
          Danger zone
        </h2>
        <span className="ds-section-meta" style={{ color: 'var(--color-danger)' }}>Destructive</span>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
            Delete all data
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4, lineHeight: 1.5 }}>
            Removes assets, transactions, portfolios, income schedules, and debts. This cannot be undone.
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 10 }}>
              {error}
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDeleteAll}
          className="btn"
          style={{
            background: 'var(--color-danger)',
            color: 'white',
            fontSize: 13,
            minWidth: 128,
          }}
        >
          {deleting ? 'Deleting...' : 'Delete all data'}
        </button>
      </div>
    </section>
  )
}
