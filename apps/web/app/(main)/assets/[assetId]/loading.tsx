import { Skeleton, SkeletonRow, SkeletonText } from '@/components/ui/skeleton'

export default function AssetDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-gap)' }}>
      <SkeletonRow style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Skeleton width={64} height={26} radius={6} inline />
        <Skeleton width={6} height={12} radius={2} inline />
        <Skeleton width={150} height={11} radius={3} inline />
      </SkeletonRow>

      <SkeletonRow
        delay={0.06}
        className="page-head"
        style={{
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, flexWrap: 'wrap' }}>
          <Skeleton width={64} height={64} radius={14} inline />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Skeleton width={260} height={34} radius={7} inline />
              <Skeleton width={86} height={24} radius={999} inline />
            </div>
            <div style={{ marginTop: 8 }}>
              <Skeleton width={190} height={12} radius={3} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Skeleton width={112} height={34} radius={8} inline />
          <Skeleton width={94} height={34} radius={8} inline />
          <Skeleton width={38} height={34} radius={8} inline />
        </div>
      </SkeletonRow>

      <SkeletonRow delay={0.12}>
        <div className="hero">
          <div className="hero-3col">
            {Array.from({ length: 3 }).map((_, i) => (
              <HeroMetricSkeleton key={i} />
            ))}
          </div>

          <div className="hero-stats">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton width={92} height={10} radius={3} />
                <div style={{ marginTop: 8 }}>
                  <Skeleton width={i === 0 ? 72 : 118} height={20} radius={5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SkeletonRow>

      <SkeletonRow delay={0.18}>
        <div className="table-wrap" style={{ padding: 0 }}>
          <div className="tabs">
            {[90, 118, 92, 72, 64].map((width, i) => (
              <div key={i} className="tab-btn" style={{ cursor: 'default' }}>
                <Skeleton width={width} height={13} radius={3} inline />
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 'var(--density-pad-y) var(--density-pad-x)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--density-gap)',
            }}
          >
            <div>
              <Skeleton width={122} height={13} radius={3} />
              <div style={{ marginTop: 12 }}>
                <SkeletonText lines={6} widths={['100%', '92%', '96%', '88%', '94%', '78%']} gap={13} height={13} />
              </div>
            </div>
            <div>
              <Skeleton width={100} height={13} radius={3} />
              <div style={{ marginTop: 12 }}>
                <SkeletonText lines={6} widths={['94%', '82%', '88%', '76%', '84%', '68%']} gap={13} height={13} />
              </div>
            </div>
          </div>
        </div>
      </SkeletonRow>
    </div>
  )
}

function HeroMetricSkeleton() {
  return (
    <div>
      <div className="hero-label">
        <Skeleton width={6} height={6} radius={999} inline />
        <Skeleton width={110} height={11} radius={3} inline />
      </div>
      <div className="hero-big">
        <Skeleton width="72%" height={44} radius={7} />
      </div>
      <span className="hero-delta neutral">
        <Skeleton width={72} height={13} radius={3} inline />
      </span>
    </div>
  )
}
