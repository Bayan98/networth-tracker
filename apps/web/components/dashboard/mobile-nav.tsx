'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  CreditCard,
  Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/assets',    label: 'Assets',   icon: TrendingUp },
  { href: '/income',    label: 'Income',   icon: DollarSign },
  { href: '/debts',     label: 'Debts',    icon: CreditCard },
  { href: '/settings',  label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="tabbar">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`tabbar-btn ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
