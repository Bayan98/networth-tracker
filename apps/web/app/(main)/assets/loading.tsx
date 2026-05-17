import { ChartLineLoading } from '@/components/charts/chart-line-loading'
import { Skeleton, SkeletonRow, SkeletonTableRows, StatCardSkeleton } from '@/components/ui/skeleton'

export default function AssetsLoading() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">Holdings · Allocation ledger</div>
          <h1>
            Your <em>holdings.</em>
          </h1>
        </div>
      </div>

      <SkeletonRow style={{ marginBottom: 'var(--density-gap)', display: 'flex', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={72} height={28} radius={6} inline />
        ))}
      </SkeletonRow>

      <StatCardSkeleton count={3} />

      <SkeletonRow delay={0.16} style={{ marginTop: 'var(--density-gap)' }}>
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: 'var(--density-pad-y) var(--density-pad-x) 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <Skeleton width={180} height={14} radius={3} inline />
            <Skeleton width={172} height={28} radius={8} inline />
          </div>
          <div style={{ height: 320, paddingBottom: 20 }}>
            <ChartLineLoading />
          </div>
        </div>
      </SkeletonRow>

      <SkeletonRow delay={0.24} style={{ marginTop: 'var(--density-gap)' }}>
        <div className="table-wrap">
          <div className="table-head">
            <Skeleton width={96} height={14} radius={3} inline />
          </div>
          <SkeletonTableRows rows={6} />
        </div>
      </SkeletonRow>
    </>
  )
}
