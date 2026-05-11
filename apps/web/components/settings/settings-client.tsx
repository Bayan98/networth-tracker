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
  { key: 'evergreen', light: 'oklch(46% 0.12 155)' },
  { key: 'indigo',    light: 'oklch(48% 0.15 265)' },
  { key: 'amber',     light: 'oklch(58% 0.14 65)' },
  { key: 'rose',      light: 'oklch(56% 0.17 15)' },
  { key: 'graphite',  light: 'oklch(30% 0.01 270)' },
]

export function SettingsClient({ profile, userEmail }: Props) {
  const router = useRouter()
  const { theme, setTheme, density, setDensity, accent, setAccent, hideAmounts, toggleHideAmounts } = useAppStore()
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

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-sunken)',
    border: '1px solid var(--border)',
    color: 'var(--ink)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    fontFamily: 'var(--font-sans)',
  }

  function PillGroup<T extends string>({
    options, value, onChange,
  }: { options: T[]; value: T; onChange: (v: T) => void }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              border: `1px solid ${value === o ? 'var(--ink)' : 'var(--border)'}`,
              borderRadius: 999,
              background: value === o ? 'var(--ink)' : 'var(--bg)',
              color: value === o ? 'var(--bg)' : 'var(--ink-2)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background .12s, color .12s',
            }}
          >
            {o}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <div className="card settings-profile-card">
        <div className="card-head">
          <div>
            <h3>Profile</h3>
            <div className="sub">Account identity and preferred display currency.</div>
          </div>
        </div>
        <form onSubmit={handleSave} className="settings-profile-form">
          <div className="settings-profile-grid">
            <div className="settings-profile-field">
              <div className="empty-label" style={{ marginBottom: 6 }}>Full name</div>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Smith"
                style={inputStyle}
              />
            </div>
            <div className="settings-profile-field">
              <div className="empty-label" style={{ marginBottom: 6 }}>Email</div>
              <input value={userEmail} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div className="settings-profile-field">
              <div className="empty-label" style={{ marginBottom: 6 }}>Default currency</div>
              <CurrencyPicker
                value={defaultCurrency}
                onChange={(c) => setDefaultCurrency(c as CurrencyCode)}
                style={inputStyle}
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
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Appearance</h3>
            <div className="sub">Theme, density, and accent. Changes apply instantly.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="appearance-grid">
          <div>
            <div className="empty-label" style={{ marginBottom: 8 }}>Theme</div>
            <PillGroup<'light' | 'dark'>
              options={['light', 'dark']}
              value={theme === 'system' ? 'light' : theme}
              onChange={setTheme}
            />
          </div>
          <div>
            <div className="empty-label" style={{ marginBottom: 8 }}>Density</div>
            <PillGroup<Density>
              options={['compact', 'cozy', 'spacious']}
              value={density}
              onChange={setDensity}
            />
          </div>
          <div>
            <div className="empty-label" style={{ marginBottom: 8 }}>Accent</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ACCENT_SWATCHES.map(({ key, light }) => (
                <div
                  key={key}
                  title={key}
                  onClick={() => setAccent(key)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: light,
                    cursor: 'pointer',
                    border: accent === key ? '2px solid var(--ink)' : '2px solid transparent',
                    boxShadow: accent === key ? '0 0 0 2px var(--bg) inset' : 'none',
                    transition: 'border-color .12s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
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
            style={{
              position: 'relative', width: 44, height: 24, borderRadius: 999,
              background: hideAmounts ? 'var(--accent)' : 'var(--border-strong)',
              border: 'none', padding: 0, cursor: 'pointer', transition: 'background .15s', flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute', top: 2, left: 0, width: 20, height: 20,
                borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                transition: 'transform .15s',
                transform: hideAmounts ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>
      </div>

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
      <div className="card-head">
        <div>
          <div className="empty-label" style={{ color: 'var(--color-danger)', marginBottom: 4 }}>
            Destructive action
          </div>
          <h3 style={{ color: 'var(--color-danger)' }}>Danger Zone</h3>
          <div className="sub">Delete portfolio data while keeping your account and profile settings.</div>
        </div>
      </div>

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
