'use client'

import { useAppStore } from '@/lib/store'
import { formatCurrency, formatCompact } from '@networth/utils'
import type { CurrencyCode } from '@networth/types'

interface MaskedAmountProps {
  amount: number
  currency?: CurrencyCode
  compact?: boolean
  className?: string
}

export function MaskedAmount({ amount, currency = 'USD', compact = false, className }: MaskedAmountProps) {
  const hideAmounts = useAppStore((s) => s.hideAmounts)

  if (hideAmounts) {
    return <span className={className}>••••••</span>
  }

  const formatted = compact
    ? formatCompact(amount, currency)
    : formatCurrency(amount, currency)

  return <span className={className}>{formatted}</span>
}
