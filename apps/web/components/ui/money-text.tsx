'use client'

import type { ReactNode } from 'react'
import type { CurrencyCode } from '@networth/types'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import { Skeleton } from '@/components/ui/skeleton'

type SkelSize = number | string

const DEFAULT_HEIGHT: SkelSize = '0.85em'

interface MoneyTextProps {
  value: number | null
  currency?: CurrencyCode
  loading?: boolean
  withSign?: boolean
  maskLength?: number
  compact?: boolean
  skelWidth?: SkelSize
  skelHeight?: SkelSize
}

export function MoneyText({
  value,
  currency = 'USD',
  loading,
  withSign,
  maskLength,
  compact,
  skelWidth = 72,
  skelHeight = DEFAULT_HEIGHT,
}: MoneyTextProps) {
  const { displayPrice } = useAmountDisplay()
  if (loading) return <Skeleton width={skelWidth} height={skelHeight} radius={3} inline />
  return <>{displayPrice(value, currency, { withSign, maskLength, compact })}</>
}

interface QuantityTextProps {
  value: number
  loading?: boolean
  maximumFractionDigits?: number
  skelWidth?: SkelSize
  skelHeight?: SkelSize
}

export function QuantityText({
  value,
  loading,
  maximumFractionDigits,
  skelWidth = 56,
  skelHeight = DEFAULT_HEIGHT,
}: QuantityTextProps) {
  const { displayQuantity } = useAmountDisplay()
  if (loading) return <Skeleton width={skelWidth} height={skelHeight} radius={3} inline />
  return <>{displayQuantity(value, { maximumFractionDigits })}</>
}

interface LoadingTextProps {
  loading?: boolean
  skelWidth?: SkelSize
  skelHeight?: SkelSize
  children: ReactNode
}

export function LoadingText({
  loading,
  skelWidth = 56,
  skelHeight = DEFAULT_HEIGHT,
  children,
}: LoadingTextProps) {
  if (loading) return <Skeleton width={skelWidth} height={skelHeight} radius={3} inline />
  return <>{children}</>
}
