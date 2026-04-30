'use client'

import { useState, useEffect } from 'react'
import { Car, Home, Gem, Briefcase } from 'lucide-react'
import type { AssetType } from '@networth/types'

const ICON_MAP: Partial<Record<string, React.FC<{ size?: number; color?: string }>>> = {
  transport: Car,
  real_estate: Home,
  commodity: Gem,
  business: Briefcase,
}

const PARQET_TYPES = new Set(['stock', 'etf', 'bond', 'mutual_fund'])

function getLogoUrl(symbol: string, assetType: string): string | null {
  if (PARQET_TYPES.has(assetType)) {
    return `https://assets.parqet.com/logos/symbol/${symbol.toUpperCase()}?format=jpg`
  }
  if (assetType === 'crypto') {
    return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/32/color/${symbol.toLowerCase()}.png`
  }
  return null
}

interface Props {
  symbol: string | null
  assetType: string
  name?: string
  size?: number
  borderRadius?: number
  color?: string
  fontSize?: number
}

export function AssetAvatar({ symbol, assetType, name, size = 32, borderRadius = 8, color, fontSize }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (symbol && (PARQET_TYPES.has(assetType) || assetType === 'crypto')) {
      setLogoUrl(getLogoUrl(symbol, assetType))
    } else {
      setLogoUrl(null)
    }
    setImgError(false)
  }, [symbol, assetType])

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  }

  const IconComp = ICON_MAP[assetType]
  if (IconComp) {
    return (
      <div style={containerStyle}>
        <IconComp size={Math.round(size * 0.45)} color="var(--ink-muted)" />
      </div>
    )
  }

  if (logoUrl && !imgError) {
    return (
      <div style={{ ...containerStyle, border: 'none', background: 'transparent' }}>
        <img
          src={logoUrl}
          alt={symbol ?? ''}
          style={{ width: size, height: size, objectFit: 'contain', display: 'block', borderRadius }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  const text = ((symbol ?? name ?? '').slice(0, 4)).toUpperCase()
  return (
    <div style={{
      ...containerStyle,
      fontFamily: 'var(--font-mono)',
      fontSize: fontSize ?? Math.round(size * 0.3),
      fontWeight: 600,
      color: color ?? 'var(--ink-2)',
      letterSpacing: '-0.02em',
    }}>
      {text || '?'}
    </div>
  )
}
