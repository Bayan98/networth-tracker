import { Skeleton, SkeletonRow, SkeletonTableRows, StatCardSkeleton } from '@/components/ui/skeleton'
import type { SkeletonColumn } from '@/components/ui/skeleton'

const INCOME_COLUMNS: SkeletonColumn[] = [
  { kind: 'text', headerLabel: 'Name', width: '60%' },
  { kind: 'text', headerLabel: 'Type', width: '50%' },
  { kind: 'num', headerLabel: 'Amount', align: 'right', width: 80 },
  { kind: 'num', headerLabel: 'Frequency', align: 'right', width: 70 },
  { kind: 'num', headerLabel: 'Next', align: 'right', width: 70 },
]

export default function IncomeLoading() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">Inflows · Cashflow calendar</div>
          <h1>
            Income streams.
          </h1>
        </div>
      </div>

      <StatCardSkeleton count={3} />

      <SkeletonRow delay={0.16} style={{ marginTop: 'var(--density-gap)' }}>
        <div className="table-wrap">
          <div className="table-head">
            <Skeleton width={96} height={14} radius={3} inline />
          </div>
          <SkeletonTableRows rows={5} columns={INCOME_COLUMNS} />
        </div>
      </SkeletonRow>
    </>
  )
}
