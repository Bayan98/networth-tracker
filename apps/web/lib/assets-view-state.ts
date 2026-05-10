'use client'

import type { AssetType } from '@networth/types'
import type { Period } from '@/components/charts/chart-utils'
import { getClientCache, setClientCache } from './client-cache'

export interface AssetsViewState {
  path: string
  selectedPortfolioId: string | null
  selectedTypes: AssetType[]
  period?: Period
}

const ASSETS_VIEW_STATE_KEY = 'assets-view-state'
const ASSETS_VIEW_STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function normalizeAssetsPath(path: string | null | undefined) {
  if (!path) return '/assets'
  if (path === '/assets' || path.startsWith('/assets?')) return path
  if (path.startsWith('/portfolios/')) return path
  return '/assets'
}

export function getAssetsViewState() {
  const state = getClientCache<AssetsViewState>(ASSETS_VIEW_STATE_KEY)
  if (!state || !Array.isArray(state.selectedTypes)) return null

  return {
    path: normalizeAssetsPath(state.path),
    selectedPortfolioId: typeof state.selectedPortfolioId === 'string' ? state.selectedPortfolioId : null,
    selectedTypes: state.selectedTypes,
    period: state.period,
  }
}

export function setAssetsViewState(state: AssetsViewState) {
  setClientCache(
    ASSETS_VIEW_STATE_KEY,
    {
      ...state,
      path: normalizeAssetsPath(state.path),
      selectedTypes: Array.from(new Set(state.selectedTypes)).sort(),
      period: state.period,
    },
    ASSETS_VIEW_STATE_TTL_MS,
  )
}
