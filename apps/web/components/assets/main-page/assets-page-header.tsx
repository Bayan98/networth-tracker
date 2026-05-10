import { Plus } from 'lucide-react'

interface Props {
  portfolioName?: string
  holdingCount: number
  portfolioCount: number
  onAddAsset: () => void
}

export function AssetsPageHeader({ portfolioName, holdingCount, portfolioCount, onAddAsset }: Props) {
  return (
    <div className="page-head">
      <div>
        <div className="empty-label">{portfolioName ? 'Portfolio' : 'Holdings'}</div>
        <h1>
          {portfolioName ?? 'My Assets'} <em>{portfolioName ? '& positions.' : ''}</em>
        </h1>
        <p>
          {holdingCount} holding{holdingCount !== 1 ? 's' : ''}{' '}
          {!portfolioName && portfolioCount > 0 && `with ${portfolioCount} portfolio${portfolioCount !== 1 ? 's' : ''}`}.
        </p>
      </div>
      <button className="btn btn-primary" onClick={onAddAsset}>
        <Plus size={14} /> Add asset
      </button>
    </div>
  )
}
