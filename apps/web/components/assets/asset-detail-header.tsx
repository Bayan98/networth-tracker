'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import { createClient } from '@/lib/supabase/client'
import type { Asset, Portfolio } from '@networth/types'
import { EditAssetDialog } from './edit-asset-dialog'

interface Props {
  asset: Asset
  portfolios: Portfolio[]
}

export function AssetDetailHeader({ asset, portfolios }: Props) {
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${asset.asset_name}"? This will also delete all its transactions.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('assets').delete().eq('id', asset.id)
    if (!error) router.push('/assets')
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{asset.symbol ?? asset.asset_name}</h1>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
            >
              {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {asset.asset_name}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {showEdit && (
        <EditAssetDialog
          asset={asset}
          portfolios={portfolios}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
