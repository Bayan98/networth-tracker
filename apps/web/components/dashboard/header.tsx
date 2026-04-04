'use client'

import { Eye, EyeOff, LogOut } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@networth/types'

const CURRENCIES = ['USD', 'KZT', 'RUB', 'EUR', 'GBP'] as const

interface HeaderProps {
  user: Profile | null
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const { hideAmounts, toggleHideAmounts, selectedCurrency, setSelectedCurrency } = useAppStore()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b shrink-0"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div />

      <div className="flex items-center gap-3">
        {/* Currency selector */}
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value as typeof selectedCurrency)}
          className="px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{
            background: 'var(--color-muted)',
            color: 'var(--color-foreground)',
            border: '1px solid var(--color-border)',
          }}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Hide amounts toggle */}
        <button
          onClick={toggleHideAmounts}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: 'var(--color-muted)',
            color: 'var(--color-muted-foreground)',
          }}
          title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
        >
          {hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        {/* User name */}
        {user?.full_name && (
          <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {user.full_name}
          </span>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: 'var(--color-muted)',
            color: 'var(--color-muted-foreground)',
          }}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
