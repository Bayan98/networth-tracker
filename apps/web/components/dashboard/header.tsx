'use client'

import { Eye, EyeOff, LogOut } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

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
      className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b shrink-0"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo on mobile (sidebar hidden) */}
      <span className="font-bold text-base tracking-tight md:hidden">
        Networth <span style={{ color: 'var(--color-accent)' }}>Tracker</span>
      </span>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2 md:gap-3">
        {/* Currency selector */}
        <CurrencyPicker
          value={selectedCurrency}
          onChange={(c) => setSelectedCurrency(c)}
          className="w-20"
          align="right"
        />

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

        {/* User name — hidden on mobile */}
        {user?.full_name && (
          <span className="hidden sm:inline text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
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
