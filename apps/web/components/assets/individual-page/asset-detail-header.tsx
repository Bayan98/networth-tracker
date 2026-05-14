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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted)' }}>
        <Link href={assetsHref} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, gap: 4 }}>
          ← Assets
        </Link>
        <span style={{ color: 'var(--ink-faint)' }}>/</span>
        <span>{asset.asset_name}</span>
      </div>

      <div className="page-head" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, flexWrap: 'wrap' }}>
          <AssetAvatar
            symbol={asset.symbol}
            assetType={asset.asset_type}
            name={asset.asset_name}
            size={64}
            borderRadius={14}
            color={typeColor}
            fontSize={17}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 36px)' }}>{asset.asset_name}</h1>
              <span className="pill-ghost" style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-2)' }}>
                {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 4 }}>
              {[asset.symbol, portfolio?.name].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <div className="asset-head-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onAddTransaction}>
            <Plus size={13} /> Transaction
          </button>
          <button className="btn btn-secondary" onClick={onAddScheduledEvent}>
            <Calendar size={13} /> Schedule
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={onToggleMoreMenu}>
              <MoreVertical size={13} />
            </button>
            {showMoreMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  onClick={onCloseMoreMenu}
                />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
                  zIndex: 20, minWidth: 148, overflow: 'hidden',
                }}>
                  {[
                    { label: 'Edit asset', icon: <Pencil size={13} />, action: onEditAsset, color: 'var(--ink)' },
                    { label: 'Delete asset', icon: <Trash2 size={13} />, action: onDeleteAsset, color: 'var(--neg)' },
                  ].map(({ label, icon, action, color }) => (
                    <button
                      key={label}
                      onClick={action}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color, textAlign: 'left' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
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
