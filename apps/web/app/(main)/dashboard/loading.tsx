import { ChartLineLoading } from '@/components/charts/chart-line-loading'
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton'

function AllocationCardSkeleton({ rows = 5, delay = 0 }: { rows?: number; delay?: number }) {
  return (
    <SkeletonRow delay={delay}>
      <div className="card">
        <div className="card-head">
          <div>
            <Skeleton width={140} height={14} radius={3} inline />
            <div style={{ marginTop: 6 }}>
              <Skeleton width={90} height={11} radius={3} inline />
            </div>
          </div>
          <Skeleton width={70} height={22} radius={6} inline />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: '50%',
              background: `conic-gradient(var(--border) 0 25%, var(--border-strong) 25% 60%, var(--border) 60% 100%)`,
              mask: 'radial-gradient(circle, transparent 56px, #000 57px)',
              WebkitMask: 'radial-gradient(circle, transparent 56px, #000 57px)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '10px 1fr 40px 60px',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <Skeleton width={10} height={10} radius={3} inline />
              <Skeleton width="70%" height={11} radius={3} />
              <Skeleton width={36} height={10} radius={3} inline />
              <Skeleton width={56} height={6} radius={3} inline />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRow>
  )
}

function TopPositionsSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <SkeletonRow delay={delay}>
      <div className="card">
        <div className="card-head">
          <div>
            <Skeleton width={130} height={14} radius={3} inline />
            <div style={{ marginTop: 6 }}>
              <Skeleton width={100} height={11} radius={3} inline />
            </div>
          </div>
          <Skeleton width={60} height={11} radius={3} inline />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr auto',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <Skeleton width={32} height={32} radius={8} inline />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <Skeleton width="55%" height={11} radius={3} />
                <Skeleton width="30%" height={9} radius={3} />
              </div>
              <Skeleton width={70} height={11} radius={3} inline />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRow>
  )
}

export default function DashboardLoading() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">Overview · Net worth ledger</div>
          <h1>
            Your money at a glance.
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
        <SkeletonRow>
          <div className="card" style={{ padding: 0 }}>
            <div className="chart-header">
              <div className="chart-header-stats">
                <div className="chart-header-stat">
                  <Skeleton width={220} height={10} radius={3} />
                  <Skeleton width={260} height={44} radius={6} />
                </div>
                <div className="chart-header-stat">
                  <Skeleton width={220} height={10} radius={3} />
                  <Skeleton width={220} height={44} radius={6} />
                </div>
              </div>
              <Skeleton width={172} height={28} radius={8} inline />
            </div>
            <div style={{ height: 420, paddingBottom: 20 }}>
              <ChartLineLoading />
            </div>
          </div>
        </SkeletonRow>

        <SkeletonRow delay={0.06}>
          <div className="ledger-strip">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="ledger-item" key={i}>
                <Skeleton width={92} height={10} radius={3} />
                <div style={{ marginTop: 8 }}>
                  <Skeleton width={42} height={28} radius={5} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <Skeleton width="70%" height={10} radius={3} />
                </div>
              </div>
            ))}
          </div>
        </SkeletonRow>

        <div className="three-col">
          <AllocationCardSkeleton delay={0.08} rows={5} />
          <AllocationCardSkeleton delay={0.14} rows={4} />
          <AllocationCardSkeleton delay={0.2} rows={4} />
        </div>

        <div className="bottom-row">
          <TopPositionsSkeleton delay={0.26} />
          <AllocationCardSkeleton delay={0.3} rows={6} />
        </div>
      </div>
    </>
  )
}
