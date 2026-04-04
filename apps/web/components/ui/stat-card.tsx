import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  change?: ReactNode
  icon?: ReactNode
}

export function StatCard({ label, value, change, icon }: StatCardProps) {
  return (
    <div
      className="p-5 rounded-xl flex flex-col gap-3"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
          {label}
        </span>
        {icon && (
          <span style={{ color: 'var(--color-muted-foreground)' }}>{icon}</span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {change && <span className="text-sm pb-0.5">{change}</span>}
      </div>
    </div>
  )
}
