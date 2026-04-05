'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { POPULAR_CURRENCIES } from '@networth/utils'
import { codes as getCodes, code as getCode } from 'currency-codes'

const ALL_CODES = getCodes()

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
  /** Where to anchor the dropdown: 'left' (default) or 'right' */
  align?: 'left' | 'right'
}

export function CurrencyPicker({ value, onChange, className, style, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = search.trim()
    ? ALL_CODES.filter(
        (c) =>
          c.toLowerCase().includes(search.toLowerCase()) ||
          (getCode(c)?.currency ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : null

  const popular = POPULAR_CURRENCIES.filter((c) => ALL_CODES.includes(c))
  const others = ALL_CODES.filter((c) => !popular.includes(c))

  const inputStyle = {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  const dropdownStyle = {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none flex items-center justify-between gap-2"
        style={style ?? inputStyle}
      >
        <span className="font-medium">{value}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-muted-foreground)' }}
        />
      </button>

      {open && (
        <div
          className={`absolute z-[200] mt-1 rounded-lg shadow-xl overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ ...dropdownStyle, width: '220px' }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Search size={12} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none min-w-0"
              style={{ color: 'var(--color-foreground)' }}
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {filtered ? (
              filtered.length === 0 ? (
                <p className="px-3 py-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  No results
                </p>
              ) : (
                filtered.map((c) => (
                  <Option
                    key={c}
                    code={c}
                    selected={c === value}
                    onSelect={() => {
                      onChange(c)
                      setOpen(false)
                      setSearch('')
                    }}
                  />
                ))
              )
            ) : (
              <>
                <GroupLabel>Popular</GroupLabel>
                {popular.map((c) => (
                  <Option
                    key={c}
                    code={c}
                    selected={c === value}
                    onSelect={() => {
                      onChange(c)
                      setOpen(false)
                      setSearch('')
                    }}
                  />
                ))}
                <div className="border-t mx-1" style={{ borderColor: 'var(--color-border)' }} />
                <GroupLabel>All currencies</GroupLabel>
                {others.map((c) => (
                  <Option
                    key={c}
                    code={c}
                    selected={c === value}
                    onSelect={() => {
                      onChange(c)
                      setOpen(false)
                      setSearch('')
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider"
      style={{ color: 'var(--color-muted-foreground)' }}
    >
      {children}
    </p>
  )
}

function Option({
  code,
  selected,
  onSelect,
}: {
  code: string
  selected: boolean
  onSelect: () => void
}) {
  const info = getCode(code)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors"
      style={{
        background: selected ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : undefined,
        color: 'var(--color-foreground)',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-muted)'
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.background = ''
      }}
    >
      <span className="font-semibold w-9 shrink-0 text-xs" style={{ color: selected ? 'var(--color-accent)' : 'var(--color-foreground)' }}>
        {code}
      </span>
      {info && (
        <span className="truncate text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {info.currency}
        </span>
      )}
    </button>
  )
}
