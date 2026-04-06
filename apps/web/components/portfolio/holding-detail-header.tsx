'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { ASSET_TYPE_LABELS } from '@networth/utils'
import type { Holding, Portfolio } from '@networth/types'
import { EditHoldingDialog } from './edit-holding-dialog'

interface Props {
  holding: Holding
  portfolios: Portfolio[]
}

export function HoldingDetailHeader({ holding, portfolios }: Props) {
  const [showEdit, setShowEdit] = useState(false)

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{holding.symbol ?? holding.asset_name}</h1>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
            >
              {ASSET_TYPE_LABELS[holding.asset_type] ?? holding.asset_type}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {holding.asset_name}
          </p>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mt-1"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
        >
          <Pencil size={12} /> Edit
        </button>
      </div>

      {showEdit && (
        <EditHoldingDialog
          holding={holding}
          portfolios={portfolios}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
