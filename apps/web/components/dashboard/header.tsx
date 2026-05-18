'use client'

import { Eye, EyeOff, Search } from 'lucide-react'
import Image from 'next/image'
import { useAppStore } from '@/lib/store'
import { CurrencyPicker } from '@/components/ui/currency-picker'
import { usePathname } from 'next/navigation'
import type { Profile } from '@networth/types'

interface HeaderProps {
  user: Profile | null
}

const CRUMBS: Record<string, { kicker: string; title: string }> = {
  '/dashboard': { kicker: 'Workspace', title: 'Overview' },
  '/assets':    { kicker: 'Workspace', title: 'Assets' },
  '/income':    { kicker: 'Workspace', title: 'Income' },
  '/debts':     { kicker: 'Workspace', title: 'Debts' },
  '/settings':  { kicker: 'Account',   title: 'Settings' },
}

export function Header({}: HeaderProps) {
  const pathname = usePathname()
  const { hideAmounts, toggleHideAmounts, selectedCurrency, setSelectedCurrency } = useAppStore()

  const crumb = CRUMBS[pathname] ?? { kicker: '', title: '' }

  return (
    <header className="topbar">
      <div className="topbar-mobile-brand">
        <div className="brand-mark" style={{ width: 24, height: 24 }}>
          <Image className="brand-mark-image" src="/icons/icon-source.svg" alt="" width={24} height={24} aria-hidden="true" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Networth
        </span>
      </div>

      <div className="topbar-crumb">
        <span className="crumb-kicker">{crumb.kicker}</span>
        <span className="crumb-title">{crumb.title}</span>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-search">
        <Search size={14} />
        <span>Search assets, tickers…</span>
        <kbd>⌘K</kbd>
      </div>

      <CurrencyPicker
        value={selectedCurrency}
        onChange={(c) => setSelectedCurrency(c)}
        className="w-20"
        align="right"
      />

      <button
        className="iconbtn"
        onClick={toggleHideAmounts}
        title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
      >
        {hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </header>
  )
}
