'use client'

import { useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useSymbolSearch, type SymbolResult } from '@/lib/hooks/use-symbol-search'
import type { LookupStatus } from '@/lib/hooks/use-symbol-lookup'
import type { AssetType } from '@networth/types'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (result: SymbolResult) => void
  lookupStatus: LookupStatus
  lookupLoading: boolean
  assetType?: AssetType
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function SymbolSearchInput({ value, onChange, onSelect, lookupStatus, lookupLoading, assetType, inputRef }: Props) {
  const { results, loading: searchLoading, search, clear } = useSymbolSearch()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  function handleChange(raw: string) {
    const v = raw.toUpperCase()
    onChange(v)
    if (v.trim()) {
      search(v, assetType)
      setOpen(true)
    } else {
      clear()
      setOpen(false)
    }
  }

  function handleSelect(result: SymbolResult) {
    onSelect(result)
    clear()
    setOpen(false)
  }

  function handleBlur() {
    // Delay so mousedown on dropdown item fires first
    setTimeout(() => setOpen(false), 150)
  }

  const showDropdown = open && results.length > 0

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          className="minput mono"
          placeholder="e.g. AAPL, BTC, VOO, HSBK"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          onBlur={handleBlur}
          autoComplete="off"
        />
        {(lookupLoading || searchLoading) && (
          <Loader2 size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', animation: 'spin 1s linear infinite' }} />
        )}
        {!lookupLoading && !searchLoading && lookupStatus === 'not_found' && (
          <AlertCircle size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--warn)' }} />
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 300,
            overflow: 'hidden',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {results.map((r) => (
            <button
              key={`${r.exchange ?? ''}-${r.symbol}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(r) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, fontSize: 12, minWidth: 72, color: 'var(--ink)', flexShrink: 0 }}>
                {r.symbol}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              {r.exchange && (
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0, background: 'var(--bg-2)', borderRadius: 4, padding: '2px 5px' }}>
                  {r.exchange}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!showDropdown && lookupStatus === 'not_found' && (
        <p style={{ fontSize: 11, color: 'var(--warn)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={10} /> Symbol not found — fill in the name manually
        </p>
      )}
    </div>
  )
}
