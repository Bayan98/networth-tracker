'use client'

interface CacheRecord<T> {
  value: T
  expiresAt: number
}

const PREFIX = 'networth-cache:'
const memory = new Map<string, CacheRecord<unknown>>()

export function getClientCache<T>(key: string): T | null {
  const now = Date.now()
  const cached = memory.get(key)
  if (cached) {
    if (cached.expiresAt > now) return cached.value as T
    memory.delete(key)
  }

  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheRecord<T>
    if (!parsed || parsed.expiresAt <= now) {
      window.sessionStorage.removeItem(PREFIX + key)
      return null
    }
    memory.set(key, parsed as CacheRecord<unknown>)
    return parsed.value
  } catch {
    return null
  }
}

export function setClientCache<T>(key: string, value: T, ttlMs: number) {
  const record: CacheRecord<T> = { value, expiresAt: Date.now() + ttlMs }
  memory.set(key, record as CacheRecord<unknown>)

  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(record))
  } catch {
    memory.delete(key)
  }
}
