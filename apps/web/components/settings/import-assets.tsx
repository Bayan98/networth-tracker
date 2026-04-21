'use client'

import { useState } from 'react'
import { Upload, Plus } from 'lucide-react'

type ProviderKey = 'csv' | 'manual'

const PROVIDERS: { id: ProviderKey; name: string; sub: string; icon: React.ReactNode }[] = [
  { id: 'csv',    name: 'CSV / Excel',  sub: 'Upload a statement file', icon: <Upload size={16} /> },
  { id: 'manual', name: 'Manual entry', sub: 'Paste or type rows',      icon: <Plus size={16} /> },
]

export function ImportAssets() {
  const [selected, setSelected] = useState<ProviderKey>('csv')
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Import assets</h3>
          <div className="sub">Bring in holdings from a file or paste rows. We'll preview before adding.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18 }} className="import-grid">
        {/* Provider selector */}
        <div>
          <div className="empty-label" style={{ marginBottom: 8 }}>Source</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr auto',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${selected === p.id ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: selected === p.id ? 'var(--surface-2)' : 'var(--surface)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background .12s, border-color .12s',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  display: 'grid', placeItems: 'center',
                  background: 'var(--bg-sunken)', border: '1px solid var(--border)',
                  color: 'var(--ink-2)',
                }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{p.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload / paste area */}
        <div>
          <div className="empty-label" style={{ marginBottom: 8 }}>
            {selected === 'csv' ? 'Upload file' : 'Paste rows'}
          </div>

          {selected === 'csv' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false) }}
              style={{
                border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '32px 20px',
                background: dragOver ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                transition: 'background .15s, border-color .15s',
                minHeight: 198,
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
              }}>
                <Upload size={18} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Drop a CSV or Excel file</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', maxWidth: 280 }}>
                We auto-detect columns like symbol, quantity, cost basis, and date.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 12px' }}>
                  Browse files
                </button>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}>
                  Download template
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-sunken)',
              minHeight: 198,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <textarea
                placeholder={'symbol,qty,cost_basis,date\nAAPL,10,145.00,2024-01-15\nBTC,0.5,42000,2024-02-01'}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink)',
                  minHeight: 148,
                }}
              />
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 12px' }}>
                  Preview import
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11, color: 'var(--ink-faint)' }}>
            <span>🔒 Encrypted at rest</span>
            <span>·</span>
            <span>Never traded on your behalf</span>
          </div>
        </div>
      </div>
    </div>
  )
}
