import Link from 'next/link'
import { Calendar, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import type { Asset, Portfolio } from '@networth/types'
import { AssetAvatar } from '@/components/ui/asset-avatar'

interface Props {
  asset: Asset
  portfolio?: Portfolio
  assetsHref: string
  typeColor: string
  showMoreMenu: boolean
  onToggleMoreMenu: () => void
  onCloseMoreMenu: () => void
  onAddTransaction: () => void
  onAddScheduledEvent: () => void
  onEditAsset: () => void
  onDeleteAsset: () => void
}

export function AssetDetailHeader({
  asset,
  portfolio,
  assetsHref,
  typeColor,
  showMoreMenu,
  onToggleMoreMenu,
  onCloseMoreMenu,
  onAddTransaction,
  onAddScheduledEvent,
  onEditAsset,
  onDeleteAsset,
}: Props) {
  return (
    <>
      <div className="asset-detail-breadcrumb">
        <Link href={assetsHref} className="asset-back-link">
          Assets
        </Link>
        <span>/</span>
        <span>{asset.asset_name}</span>
      </div>

      <div className="page-head asset-detail-head">
        <div className="asset-detail-identity">
          <AssetAvatar
            symbol={asset.symbol}
            assetType={asset.asset_type}
            name={asset.asset_name}
            size={64}
            borderRadius={14}
            color={typeColor}
            fontSize={17}
          />
          <div className="asset-detail-title">
            <div className="page-kicker">Asset statement</div>
            <div className="asset-detail-title-row">
              <h1>{asset.asset_name}</h1>
              <span className="pill-ghost asset-type-pill" style={{ borderColor: typeColor }}>
                {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
              </span>
            </div>
            <div className="asset-detail-meta">
              {[asset.symbol, portfolio?.name].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <div className="asset-head-actions">
          <button className="btn btn-secondary" onClick={onAddTransaction}>
            <Plus size={13} /> Transaction
          </button>
          <button className="btn btn-secondary" onClick={onAddScheduledEvent}>
            <Calendar size={13} /> Schedule
          </button>
          <div className="asset-menu-wrap">
            <button className="btn btn-secondary" onClick={onToggleMoreMenu}>
              <MoreVertical size={13} />
            </button>
            {showMoreMenu && (
              <>
                <div
                  className="asset-menu-scrim"
                  onClick={onCloseMoreMenu}
                />
                <div className="asset-menu">
                  {[
                    { label: 'Edit asset', icon: <Pencil size={13} />, action: onEditAsset, color: 'var(--ink)' },
                    { label: 'Delete asset', icon: <Trash2 size={13} />, action: onDeleteAsset, color: 'var(--neg)' },
                  ].map(({ label, icon, action, color }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="asset-menu-item"
                      style={{ color }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
