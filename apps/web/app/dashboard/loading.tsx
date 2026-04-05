export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-lg" style={{ background: 'var(--color-muted)' }} />
        <div className="h-4 w-48 rounded" style={{ background: 'var(--color-muted)' }} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl h-24"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-xl h-64"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        />
        <div
          className="rounded-xl h-64"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="h-4 w-24 rounded" style={{ background: 'var(--color-muted)' }} />
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: 'var(--color-muted)' }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-20 rounded" style={{ background: 'var(--color-muted)' }} />
              <div className="h-3 w-32 rounded" style={{ background: 'var(--color-muted)' }} />
            </div>
            <div className="space-y-1.5 text-right">
              <div className="h-3.5 w-16 rounded" style={{ background: 'var(--color-muted)' }} />
              <div className="h-3 w-12 rounded" style={{ background: 'var(--color-muted)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
