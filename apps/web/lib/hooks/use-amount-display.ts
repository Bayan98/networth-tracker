'use client'

import { useMemo } from 'react'
import {
  displayPrice as formatDisplayPrice,
  displayQuantity as formatDisplayQuantity,
} from '@networth/utils'
import { useAppStore } from '@/lib/store'

type DisplayPriceOptions = NonNullable<Parameters<typeof formatDisplayPrice>[2]>
type DisplayQuantityOptions = NonNullable<Parameters<typeof formatDisplayQuantity>[1]>

export function useAmountDisplay() {
  const hideAmounts = useAppStore((s) => s.hideAmounts)

  return useMemo(() => ({
    hideAmounts,
    displayPrice: (
      amount: Parameters<typeof formatDisplayPrice>[0],
      currency: Parameters<typeof formatDisplayPrice>[1] = 'USD',
      options: DisplayPriceOptions = {},
    ) => formatDisplayPrice(amount, currency, { ...options, hideAmounts }),
    displayQuantity: (
      quantity: Parameters<typeof formatDisplayQuantity>[0],
      options: DisplayQuantityOptions = {},
    ) => formatDisplayQuantity(quantity, { ...options, hideAmounts }),
  }), [hideAmounts])
}
