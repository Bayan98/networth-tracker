import { Skeleton, SkeletonRow, SkeletonTableRows, StatCardSkeleton } from '@/components/ui/skeleton'
import type { SkeletonColumn } from '@/components/ui/skeleton'

const DEBT_COLUMNS: SkeletonColumn[] = [
  { kind: 'text', headerLabel: 'Name', width: '60%' },
  { kind: 'text', headerLabel: 'Type', width: '50%' },
  { kind: 'num', headerLabel: 'Balance', align: 'right', width: 80 },
  { kind: 'num', headerLabel: 'Rate', align: 'right', width: 50 },
  { kind: 'num', headerLabel: 'Updated', align: 'right', width: 70 },
]

export default function DebtsLoading() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">Liabilities · Payoff ledger</div>
          <h1>
            Debts &amp; liabilities.
          </h1>
        </div>
      </div>

      <StatCardSkeleton count={3} />

      <SkeletonRow delay={0.16} style={{ marginTop: 'var(--density-gap)' }}>
        <div className="table-wrap">
          <div className="table-head">
            <Skeleton width={96} height={14} radius={3} inline />
          </div>
          <SkeletonTableRows rows={4} columns={DEBT_COLUMNS} />
        </div>
      </SkeletonRow>
    </>
  )
}
