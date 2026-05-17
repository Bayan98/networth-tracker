'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { CurrencyCode } from '@networth/types'

export type Density = 'compact' | 'cozy' | 'spacious'
export type Accent = 'moss' | 'indigo' | 'amber' | 'rose' | 'graphite'

interface AppState {
  selectedCurrency: CurrencyCode
  setSelectedCurrency: (currency: CurrencyCode) => void

  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  density: Density
  setDensity: (density: Density) => void

  accent: Accent
  setAccent: (accent: Accent) => void

  hideAmounts: boolean
  toggleHideAmounts: () => void

  assetTypeFilter: 'all' | 'crypto' | 'stock' | 'etf' | 'bond' | 'other'
  setAssetTypeFilter: (filter: AppState['assetTypeFilter']) => void

  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        selectedCurrency: 'USD',
        setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),

        theme: 'dark',
        setTheme: (theme) => set({ theme }),

        density: 'cozy',
        setDensity: (density) => set({ density }),

        accent: 'moss',
        setAccent: (accent) => set({ accent }),

        hideAmounts: false,
        toggleHideAmounts: () => set((s) => ({ hideAmounts: !s.hideAmounts })),

        assetTypeFilter: 'all',
        setAssetTypeFilter: (filter) => set({ assetTypeFilter: filter }),

        sidebarCollapsed: false,
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      }),
      {
        name: 'networth-settings',
        partialize: (s) => ({
          selectedCurrency: s.selectedCurrency,
          theme: s.theme,
          density: s.density,
          accent: (s.accent as Accent | 'evergreen') === 'evergreen' ? 'moss' : s.accent,
          hideAmounts: s.hideAmounts,
        }),
      },
    ),
  ),
)
