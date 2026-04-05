'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  ArrowLeftRight,
  DollarSign,
  CreditCard,
  Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/portfolio', label: 'Holdings', icon: TrendingUp },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/income', label: 'Income', icon: DollarSign },
  { href: '/dashboard/debts', label: 'Debts', icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 hidden md:flex flex-col border-r shrink-0"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center px-6 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="font-bold text-lg tracking-tight">
          Networth <span style={{ color: 'var(--color-accent)' }}>Tracker</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: isActive ? 'var(--color-muted)' : 'transparent',
                color: isActive ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Settings link */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>
    </aside>
  )
}
