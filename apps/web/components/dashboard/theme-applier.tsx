'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import type { Accent } from '@/lib/store'

type AccentTokenSet = {
  light: string
  lightHover: string
  lightInk: string
  softLight: string
  dark: string
  darkHover: string
  darkInk: string
  softDark: string
}

const ACCENT_PALETTE: Record<Accent, AccentTokenSet> = {
  moss: {
    light: '#2F4A2B',
    lightHover: '#233A21',
    lightInk: '#F5F1E8',
    softLight: '#DDE3D2',
    dark: '#95B97B',
    darkHover: '#B8D69B',
    darkInk: '#050402',
    softDark: 'rgba(149, 185, 123, 0.20)',
  },
  indigo: {
    light: '#3F4D63',
    lightHover: '#2B3A4A',
    lightInk: '#F5F1E8',
    softLight: '#D7DDE5',
    dark: '#8AA6C2',
    darkHover: '#ADC4D8',
    darkInk: '#050402',
    softDark: 'rgba(138, 166, 194, 0.16)',
  },
  amber: {
    light: '#8A6A14',
    lightHover: '#6F5310',
    lightInk: '#F5F1E8',
    softLight: '#F0E5C5',
    dark: '#D8B252',
    darkHover: '#E8CA7A',
    darkInk: '#050402',
    softDark: 'rgba(216, 178, 82, 0.15)',
  },
  rose: {
    light: '#7A2E2A',
    lightHover: '#62231F',
    lightInk: '#F5F1E8',
    softLight: '#ECD8D5',
    dark: '#D26D5C',
    darkHover: '#E18D7E',
    darkInk: '#050402',
    softDark: 'rgba(210, 109, 92, 0.18)',
  },
  graphite: {
    light: '#2E2A24',
    lightHover: '#1A1813',
    lightInk: '#F5F1E8',
    softLight: '#E5DED0',
    dark: '#B0A892',
    darkHover: '#DCD3BC',
    darkInk: '#050402',
    softDark: 'rgba(176, 168, 146, 0.18)',
  },
}

function normalizeAccent(accent: Accent | 'evergreen'): Accent {
  return accent === 'evergreen' ? 'moss' : accent
}

export function ThemeApplier() {
  const theme = useAppStore((s) => s.theme)
  const density = useAppStore((s) => s.density)
  const accent = useAppStore((s) => s.accent as Accent | 'evergreen')

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')

    if (density === 'compact') root.setAttribute('data-density', 'compact')
    else if (density === 'spacious') root.setAttribute('data-density', 'spacious')
    else root.removeAttribute('data-density')

    const pal = ACCENT_PALETTE[normalizeAccent(accent)]
    if (pal) {
      root.style.setProperty('--accent', isDark ? pal.dark : pal.light)
      root.style.setProperty('--accent-hover', isDark ? pal.darkHover : pal.lightHover)
      root.style.setProperty('--accent-ink', isDark ? pal.darkInk : pal.lightInk)
      root.style.setProperty('--accent-soft', isDark ? pal.softDark : pal.softLight)
    }
  }, [theme, density, accent])

  return null
}
