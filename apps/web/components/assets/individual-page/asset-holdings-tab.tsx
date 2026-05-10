import type { Holding } from '@/lib/hooks/use-asset-info'
import { tdStyle, thStyle } from './asset-detail-utils'

export function AssetHoldingsTab({ holdings }: { holdings: Holding[] }) {
  const total = holdings.reduce((sum, holding) => sum + holding.pct, 0)
  return (
    <div>
      <div className="empty-label" style={{ marginBottom: 12 }}>ETF Holdings</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Symbol</th>
            <th style={thStyle}>Name</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Weight</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding, index) => (
            <tr key={holding.symbol || index} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                {holding.symbol || '—'}
              </td>
              <td style={{ ...tdStyle, color: 'var(--ink-2)' }}>{holding.name}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (holding.pct / (total || 1)) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 40, textAlign: 'right' }}>
                    {(holding.pct * 100).toFixed(2)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
