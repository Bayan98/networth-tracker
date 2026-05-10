'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  CreditCard,
  Settings,
  Plus,
} from 'lucide-react'
import type { Profile, Portfolio } from '@networth/types'
import { AddPortfolioDialog } from '@/components/assets'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, countKey: null },
  { href: '/assets', label: 'Assets', icon: TrendingUp, countKey: 'assets' as const },
  { href: '/income', label: 'Income', icon: DollarSign, countKey: 'income' as const },
  { href: '/debts', label: 'Debts', icon: CreditCard, countKey: 'debts' as const },
]

interface SidebarProps {
  user: Profile | null
  portfolios: Portfolio[]
  counts: { assets: number; income: number; debts: number }
  portfolioAssetCounts: Record<string, number>
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

export function Sidebar({ user, portfolios, counts, portfolioAssetCounts }: SidebarProps) {
  const pathname = usePathname()
  const initials = getInitials(user?.full_name, user?.email)
  const [showAddPortfolio, setShowAddPortfolio] = useState(false)

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div className="brand-name">Net<em>worth</em></div>
        </div>

        <div className="nav-group">
          <div className="nav-label">Workspace</div>
          {NAV_ITEMS.map(({ href, label, icon: Icon, countKey }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href) && !pathname.startsWith('/portfolios'))
            const count = countKey ? counts[countKey] : null
            return (
              <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={16} />
                <span>{label}</span>
                {count != null && count > 0 && <span className="nav-count">{count}</span>}
              </Link>
            )
          })}
        </div>

        <div className="nav-group">
          {/* Header row: label + add button on the same line */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
              Portfolios
            </span>
            <button
              onClick={() => setShowAddPortfolio(true)}
              className="iconbtn"
              style={{ width: 20, height: 20, flexShrink: 0 }}
              title="New portfolio"
            >
              <Plus size={11} />
            </button>
          </div>

          {portfolios.map((p) => {
            const isActive = pathname.startsWith(`/portfolios/${p.id}`)
            const assetCount = portfolioAssetCounts[p.id] ?? 0
            return (
              <Link
                key={p.id}
                href={`/portfolios/${p.id}`}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ fontSize: 13 }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isActive ? 'var(--accent)' : 'var(--border-strong)',
                  marginLeft: 5, marginRight: 4, flexShrink: 0,
                }} />
                <span style={{ color: isActive ? 'var(--ink)' : 'var(--ink-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                {assetCount > 0 && (
                  <span className="nav-count">{assetCount}</span>
                )}
              </Link>
            )
          })}

          <button className="nav-add" onClick={() => setShowAddPortfolio(true)}>
            <Plus size={12} /> New portfolio
          </button>
        </div>

        <div className="sidebar-foot">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            {user?.full_name && <div className="user-name">{user.full_name}</div>}
            {user?.email && <div className="user-email">{user.email}</div>}
          </div>
          <Link href="/settings" className="iconbtn" style={{ marginLeft: 'auto' }} title="Settings">
            <Settings size={15} />
          </Link>
        </div>
      </aside>

      {showAddPortfolio && user && (
        <AddPortfolioDialog userId={user.id} onClose={() => setShowAddPortfolio(false)} />
      )}
    </>
  )
}
