import type { Holding } from '@/lib/hooks/use-asset-info'

export function AssetHoldingsTab({ holdings, title = 'Holdings' }: { holdings: Holding[]; title?: string }) {
  const total = holdings.reduce((sum, holding) => sum + holding.pct, 0)
  return (
    <div>
      <div className="empty-label" style={{ marginBottom: 12 }}>{title}</div>
      <div className="tab-table">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th className="num">Weight</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, index) => (
              <tr key={holding.symbol || index}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                  {holding.symbol || '—'}
                </td>
                <td data-label="Name" style={{ color: 'var(--ink-2)' }}>{holding.name}</td>
                <td data-label="Weight" className="num">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--ink-3)', overflow: 'hidden' }}>
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
    </div>
  )
}
