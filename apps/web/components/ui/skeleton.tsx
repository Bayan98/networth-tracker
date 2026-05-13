import type { CSSProperties, ReactNode } from 'react'

type SizeValue = number | string

interface SkeletonProps {
  width?: SizeValue
  height?: SizeValue
  radius?: SizeValue
  className?: string
  style?: CSSProperties
  inline?: boolean
}

export function Skeleton({ width, height = 12, radius = 4, className, style, inline = false }: SkeletonProps) {
  return (
    <span
      className={`skel${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{
        display: inline ? 'inline-block' : 'block',
        width: width ?? (inline ? undefined : '100%'),
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  widths?: SizeValue[]
  height?: SizeValue
  gap?: number
}

export function SkeletonText({ lines = 1, widths, height = 11, gap = 6 }: SkeletonTextProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={height} width={widths?.[i] ?? (i === lines - 1 ? '60%' : '100%')} />
      ))}
    </div>
  )
}

interface SkeletonRowProps {
  delay?: number
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function SkeletonRow({ delay = 0, children, className, style }: SkeletonRowProps) {
  return (
    <div
      className={`skel-row${className ? ` ${className}` : ''}`}
      style={{ ['--cd' as string]: `${delay}s`, ...style }}
    >
      {children}
    </div>
  )
}

interface PageHeadSkeletonProps {
  eyebrowWidth?: SizeValue
  titleWidth?: SizeValue
}

export function PageHeadSkeleton({ eyebrowWidth = 90, titleWidth = 280 }: PageHeadSkeletonProps) {
  return (
    <div className="page-head">
      <div>
        <Skeleton width={eyebrowWidth} height={11} radius={3} inline />
        <div style={{ marginTop: 14 }}>
          <Skeleton width={titleWidth} height={32} radius={6} inline />
        </div>
      </div>
    </div>
  )
}

interface StatCardSkeletonProps {
  count?: number
  height?: number
}

export function StatCardSkeleton({ count = 4, height = 96 }: StatCardSkeletonProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
        gap: 'var(--density-gap)',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} delay={i * 0.06}>
          <div className="card" style={{ height, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Skeleton width={70} height={10} radius={3} />
            <Skeleton width="60%" height={22} radius={5} />
            <Skeleton width={50} height={10} radius={3} />
          </div>
        </SkeletonRow>
      ))}
    </div>
  )
}

interface SkeletonTableRowsProps {
  rows?: number
  columns?: SkeletonColumn[]
  showHeader?: boolean
}

export interface SkeletonColumn {
  kind?: 'avatar-text' | 'text' | 'num' | 'pill'
  width?: SizeValue
  align?: 'left' | 'right'
  headerLabel?: string
}

const DEFAULT_HOLDINGS_COLUMNS: SkeletonColumn[] = [
  { kind: 'avatar-text', headerLabel: 'Asset' },
  { kind: 'text', headerLabel: 'Portfolio', width: '60%' },
  { kind: 'num', headerLabel: 'Price', align: 'right', width: 70 },
  { kind: 'pill', headerLabel: 'Change', align: 'right', width: 56 },
  { kind: 'num', headerLabel: 'Value', align: 'right', width: 80 },
  { kind: 'num', headerLabel: 'Share', align: 'right', width: 36 },
]

export function SkeletonTableRows({
  rows = 6,
  columns = DEFAULT_HOLDINGS_COLUMNS,
  showHeader = true,
}: SkeletonTableRowsProps) {
  return (
    <table>
      {showHeader && (
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={col.align === 'right' ? 'num' : undefined}>
                {col.headerLabel ?? ''}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr key={rowIdx} className="skel-row" style={{ ['--cd' as string]: `${rowIdx * 0.06}s` }}>
            {columns.map((col, i) => (
              <td key={i} className={col.align === 'right' ? 'num' : undefined}>
                {renderCell(col)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function renderCell(col: SkeletonColumn) {
  if (col.kind === 'avatar-text') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton width={32} height={32} radius={8} inline />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
          <Skeleton width="60%" height={11} radius={3} />
          <Skeleton width="35%" height={9} radius={3} />
        </div>
      </div>
    )
  }
  if (col.kind === 'pill') {
    return (
      <div style={{ display: 'flex', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
        <Skeleton width={col.width ?? 56} height={18} radius={999} inline />
      </div>
    )
  }
  if (col.kind === 'num') {
    return (
      <div style={{ display: 'flex', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
        <Skeleton width={col.width ?? 70} height={10} radius={3} inline />
      </div>
    )
  }
  return <Skeleton width={col.width ?? '70%'} height={10} radius={3} />
}
