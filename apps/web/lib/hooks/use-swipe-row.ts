'use client'

import type { CSSProperties, TouchEvent as ReactTouchEvent } from 'react'
import { useRef, useState } from 'react'

const REVEAL_WIDTH = 112
const SNAP_THRESHOLD = REVEAL_WIDTH / 2

interface SwipeRow {
  style: CSSProperties
  handlers: {
    onTouchStart: (e: ReactTouchEvent) => void
    onTouchMove: (e: ReactTouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
  }
  revealed: boolean
  reset: () => void
}

export function useSwipeRow(): SwipeRow {
  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(true)
  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const dragging = useRef(false)
  const horizontal = useRef<boolean | null>(null)

  return {
    style: {
      ['--swipe-offset' as string]: `${offset}px`,
      ['--swipe-transition' as string]: animating ? 'transform 0.22s ease' : 'none',
    } as CSSProperties,
    handlers: {
      onTouchStart(e) {
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        startOffset.current = offset
        dragging.current = true
        horizontal.current = null
        setAnimating(false)
      },
      onTouchMove(e) {
        if (!dragging.current) return
        const dx = e.touches[0].clientX - startX.current
        const dy = e.touches[0].clientY - startY.current
        if (horizontal.current === null) {
          if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
            horizontal.current = Math.abs(dx) > Math.abs(dy)
          }
        }
        if (horizontal.current === false) {
          dragging.current = false
          setAnimating(true)
          setOffset(startOffset.current)
          return
        }
        if (horizontal.current === true) {
          const next = Math.min(0, Math.max(-REVEAL_WIDTH, startOffset.current + dx))
          setOffset(next)
        }
      },
      onTouchEnd() {
        if (!dragging.current) return
        dragging.current = false
        setAnimating(true)
        setOffset((current) => (current < -SNAP_THRESHOLD ? -REVEAL_WIDTH : 0))
      },
      onTouchCancel() {
        dragging.current = false
        setAnimating(true)
        setOffset(startOffset.current)
      },
    },
    revealed: offset < -SNAP_THRESHOLD,
    reset: () => {
      setAnimating(true)
      setOffset(0)
    },
  }
}
