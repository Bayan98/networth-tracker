import { ChartLineLoading } from '@/components/charts/chart-line-loading'
import {
  PageHeadSkeleton,
  Skeleton,
  SkeletonRow,
  SkeletonTableRows,
  StatCardSkeleton,
} from '@/components/ui/skeleton'

export default function MainLoading() {
  return (
    <>
      <PageHeadSkeleton />

      <StatCardSkeleton count={4} />

      <SkeletonRow delay={0.12} style={{ marginTop: 'var(--density-gap)' }}>
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: 'var(--density-pad-y) var(--density-pad-x) 20px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton width={140} height={10} radius={3} />
              <Skeleton width={220} height={36} radius={6} />
            </div>
            <Skeleton width={172} height={28} radius={8} inline />
          </div>
          <div style={{ height: 320, paddingBottom: 20 }}>
            <ChartLineLoading />
          </div>
        </div>
      </SkeletonRow>

      <SkeletonRow delay={0.2} style={{ marginTop: 'var(--density-gap)' }}>
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
