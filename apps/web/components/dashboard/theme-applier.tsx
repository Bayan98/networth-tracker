'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

const ACCENT_PALETTE: Record<string, { light: string; dark: string; softLight: string; softDark: string }> = {
  evergreen: { light: 'oklch(46% 0.12 155)', dark: 'oklch(72% 0.14 155)', softLight: 'oklch(93% 0.04 155)', softDark: 'oklch(28% 0.05 155)' },
  indigo:    { light: 'oklch(48% 0.15 265)', dark: 'oklch(72% 0.14 265)', softLight: 'oklch(93% 0.04 265)', softDark: 'oklch(28% 0.06 265)' },
  amber:     { light: 'oklch(58% 0.14 65)',  dark: 'oklch(76% 0.14 70)',  softLight: 'oklch(94% 0.04 70)',  softDark: 'oklch(30% 0.06 70)' },
  rose:      { light: 'oklch(56% 0.17 15)',  dark: 'oklch(74% 0.15 15)',  softLight: 'oklch(94% 0.04 15)',  softDark: 'oklch(30% 0.06 15)' },
  graphite:  { light: 'oklch(30% 0.01 270)', dark: 'oklch(82% 0.005 95)', softLight: 'oklch(92% 0.005 95)', softDark: 'oklch(30% 0.008 270)' },
}

export function ThemeApplier() {
  const theme = useAppStore((s) => s.theme)
  const density = useAppStore((s) => s.density)
  const accent = useAppStore((s) => s.accent)

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')

    if (density === 'compact') root.setAttribute('data-density', 'compact')
    else if (density === 'spacious') root.setAttribute('data-density', 'spacious')
    else root.removeAttribute('data-density')

    const pal = ACCENT_PALETTE[accent]
    if (pal) {
      root.style.setProperty('--accent', isDark ? pal.dark : pal.light)
      root.style.setProperty('--accent-soft', isDark ? pal.softDark : pal.softLight)
    }
  }, [theme, density, accent])

  return null
}
