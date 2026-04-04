'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { CurrencyCode } from '@networth/types'

interface AppState {
  selectedCurrency: CurrencyCode
  setSelectedCurrency: (currency: CurrencyCode) => void

  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

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

        theme: 'system',
        setTheme: (theme) => set({ theme }),

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
          hideAmounts: s.hideAmounts,
        }),
      },
    ),
  ),
)
