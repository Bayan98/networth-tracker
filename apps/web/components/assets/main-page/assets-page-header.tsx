import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  portfolioName?: string
  holdingCount: number
  portfolioCount: number
  onAddAsset: () => void
  portfolioSelector?: ReactNode
}

export function AssetsPageHeader({
  portfolioName,
  holdingCount,
  portfolioCount,
  onAddAsset,
  portfolioSelector,
}: Props) {
  return (
    <div className="page-head">
      <div>
        <div className="page-kicker">{portfolioName ? 'Portfolio · Positions' : 'Holdings · Allocation ledger'}</div>
        <h1>
          {portfolioName ?? 'My Assets'} <em>{portfolioName ? '& positions.' : 'by value.'}</em>
        </h1>
        <p>
          {holdingCount} holding{holdingCount !== 1 ? 's' : ''}{' '}
          {!portfolioName && portfolioCount > 0 && `with ${portfolioCount} portfolio${portfolioCount !== 1 ? 's' : ''}`}
          .
        </p>
      </div>
      <div className="assets-head-actions">
        {portfolioSelector}
        <button className="btn btn-primary" onClick={onAddAsset}>
          <Plus size={14} /> Add asset
        </button>
      </div>
    </div>
  )
}
