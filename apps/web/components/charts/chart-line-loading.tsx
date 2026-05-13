interface Props {
  height?: number | string
}

export function ChartLineLoading({ height = '100%' }: Props) {
  return (
    <div className="chart-line-loading" style={{ height }} aria-busy="true" aria-label="Loading chart">
      <svg className="cll-svg" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
        <line className="cll-grid" x1="0" y1="36"  x2="600" y2="36" />
        <line className="cll-grid" x1="0" y1="72"  x2="600" y2="72" />
        <line className="cll-grid" x1="0" y1="108" x2="600" y2="108" />
        <line className="cll-grid" x1="0" y1="144" x2="600" y2="144" />
        <line className="cll-base" x1="0" y1="180" x2="600" y2="180" />
        <path
          className="cll-ghost"
          d="M0,128 C40,118 70,100 110,98 C150,96 180,118 220,108 C260,98 290,68 330,60 C370,52 400,76 440,62 C480,48 510,34 540,28 C570,22 590,26 600,24"
        />
        <path
          className="cll-trace"
          d="M0,128 C40,118 70,100 110,98 C150,96 180,118 220,108 C260,98 290,68 330,60 C370,52 400,76 440,62 C480,48 510,34 540,28 C570,22 590,26 600,24"
          pathLength={1000}
        />
      </svg>
    </div>
  )
}
