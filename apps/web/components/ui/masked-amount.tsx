'use client'

import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import type { CurrencyCode } from '@networth/types'
import { withDimFraction } from '@/components/ui/money-text'

interface MaskedAmountProps {
  amount: number
  currency?: CurrencyCode
  compact?: boolean
  className?: string
}

export function MaskedAmount({ amount, currency = 'USD', compact = false, className }: MaskedAmountProps) {
  const { displayPrice } = useAmountDisplay()

  return <span className={className}>{withDimFraction(displayPrice(amount, currency, { compact }))}</span>
}
