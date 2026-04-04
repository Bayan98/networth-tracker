'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import type { Profile, CurrencyCode } from '@networth/types'

interface Props {
  profile: Profile | null
  userEmail: string
}

export function SettingsClient({ profile, userEmail }: Props) {
  const router = useRouter()
  const { theme, setTheme, hideAmounts, toggleHideAmounts } = useAppStore()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(
    profile?.default_currency ?? 'USD',
  )
  const [loading, setLoading] = useState(false)
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

  const inputStyle = {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  const cardStyle = {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2 className="text-sm font-semibold mb-4">Profile</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              value={userEmail}
              disabled
              className="w-full px-3 py-2 rounded-lg text-sm opacity-60"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default currency</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              {['USD', 'KZT', 'RUB', 'EUR', 'GBP'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            {loading ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Display preferences */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2 className="text-sm font-semibold mb-4">Display</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                Choose your preferred theme
              </p>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Hide amounts</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                Mask financial figures for privacy
              </p>
            </div>
            <button
              onClick={toggleHideAmounts}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{
                background: hideAmounts ? 'var(--color-accent)' : 'var(--color-muted)',
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: hideAmounts ? 'translateX(21px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
