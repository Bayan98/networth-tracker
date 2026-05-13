import { ChartLineLoading } from '@/components/charts/chart-line-loading'
import { Skeleton, SkeletonRow, SkeletonText } from '@/components/ui/skeleton'

export default function AssetDetailLoading() {
  return (
    <>
      <SkeletonRow>
        <Skeleton width={120} height={11} radius={3} inline />
      </SkeletonRow>

      <SkeletonRow
        delay={0.06}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        <Skeleton width={56} height={56} radius={12} inline />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <Skeleton width={220} height={26} radius={5} />
          <Skeleton width={140} height={12} radius={3} />
        </div>
        <Skeleton width={120} height={36} radius={8} inline />
      </SkeletonRow>

      <SkeletonRow
        delay={0.12}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--density-gap)',
          marginBottom: 'var(--density-gap)',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: 10, height: 96, justifyContent: 'space-between' }}
          >
            <Skeleton width={70} height={10} radius={3} />
            <Skeleton width="60%" height={22} radius={5} />
            <Skeleton width={50} height={10} radius={3} />
          </div>
        ))}
      </SkeletonRow>

      <SkeletonRow delay={0.18} style={{ marginBottom: 'var(--density-gap)', display: 'flex', gap: 8 }}>
        {['Overview', 'Performance', 'Transactions', 'Holdings'].map((_, i) => (
          <Skeleton key={i} width={92} height={28} radius={6} inline />
        ))}
      </SkeletonRow>

      <SkeletonRow delay={0.24}>
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
              <Skeleton width={200} height={28} radius={5} />
            </div>
            <Skeleton width={172} height={28} radius={8} inline />
          </div>
          <div style={{ height: 320, paddingBottom: 20 }}>
            <ChartLineLoading />
          </div>
        </div>
      </SkeletonRow>

      <SkeletonRow delay={0.3} style={{ marginTop: 'var(--density-gap)' }}>
        <div className="card">
          <SkeletonText lines={4} widths={['40%', '70%', '85%', '55%']} gap={10} height={11} />
        </div>
      </SkeletonRow>
    </>
  )
}
