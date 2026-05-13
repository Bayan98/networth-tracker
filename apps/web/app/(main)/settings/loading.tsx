import { Skeleton, SkeletonRow, SkeletonText } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="empty-label">You</div>
          <h1>Settings.</h1>
        </div>
      </div>

      {[0, 1, 2].map((i) => (
        <SkeletonRow key={i} delay={i * 0.08} style={{ marginBottom: 'var(--density-gap)' }}>
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <Skeleton width={140} height={14} radius={3} />
                  <div style={{ marginTop: 8 }}>
                    <Skeleton width="80%" height={11} radius={3} />
                  </div>
                </div>
                <Skeleton width={180} height={32} radius={6} inline />
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <SkeletonText lines={3} widths={['30%', '90%', '70%']} gap={10} height={11} />
              </div>
            </div>
          </div>
        </SkeletonRow>
      ))}
    </>
  )
}
