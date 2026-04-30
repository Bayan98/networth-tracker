'use client'

import { useState, useEffect } from 'react'
import type { AssetType } from '@networth/types'

const PARQET_TYPES: AssetType[] = ['stock', 'etf', 'bond', 'mutual_fund']

function resolveUrl(symbol: string, assetType: AssetType): string | null {
  if (PARQET_TYPES.includes(assetType)) {
    return `https://assets.parqet.com/logos/symbol/${symbol.toUpperCase()}?format=jpg`
  }
  if (assetType === 'crypto') {
    return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/32/color/${symbol.toLowerCase()}.png`
  }
  return null
}

export function useAssetLogo(
  symbol: string | null,
  assetType: AssetType,
): { logoUrl: string | null; loading: boolean } {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    setLogoUrl(symbol ? resolveUrl(symbol, assetType) : null)
  }, [symbol, assetType])

  return { logoUrl, loading: false }
}
