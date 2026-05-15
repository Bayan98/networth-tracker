export type Period = "1w" | "1m" | "1y" | "5y";

export const PERIODS: Period[] = ["1w", "1m", "1y", "5y"];
export const PERIOD_LABELS: Record<Period, string> = {
  "1w": "1W",
  "1m": "1M",
  "1y": "1Y",
  "5y": "5Y",
};
export const PERIOD_HEADER_LABELS: Record<Period, string> = {
  "1w": "Past 1W",
  "1m": "Past 1M",
  "1y": "Past 1Y",
  "5y": "Past 5Y",
};

export const CHART_TOOLTIP_STYLE = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: 12,
};

export function formatChartDate(dateStr: string, period: Period): string {
  const d = new Date(dateStr.length === 10 ? dateStr + "T12:00:00Z" : dateStr);
  if (period === "1w" || period === "1m") {
    return d.toLocaleString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function toChartTimestamp(date: string): number {
  return new Date(date + "T12:00:00Z").getTime();
}

export function getChartSeriesMin<T>(
  points: T[],
  getValues: (point: T) => Array<number | null | undefined>,
): number {
  const values = points
    .flatMap(getValues)
    .filter((value): value is number => Number.isFinite(value));
  return values.length > 0 ? Math.min(...values) * 0.99 : 0;
}

export interface MarketSeriesPoint {
  date: string;
  marketValue: number;
  costBasis: number;
}

export type MarketSeriesChartPoint = MarketSeriesPoint & {
  timestamp: number;
  mvAbove: number | null;
  mvBelow: number | null;
  isCrossPoint?: boolean;
};

function toColoredMarketPoint(point: MarketSeriesPoint): MarketSeriesChartPoint {
  const isAboveOrEqual = point.marketValue >= point.costBasis;
  return {
    ...point,
    timestamp: toChartTimestamp(point.date),
    mvAbove: isAboveOrEqual ? point.marketValue : null,
    mvBelow: isAboveOrEqual ? null : point.marketValue,
  };
}

export function splitMarketValueSeries<T extends MarketSeriesPoint>(
  series: T[],
): MarketSeriesChartPoint[] {
  if (series.length <= 1) return series.map(toColoredMarketPoint);

  const out: MarketSeriesChartPoint[] = [];
  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i];
    const b = series[i + 1];
    out.push(toColoredMarketPoint(a));

    const d1 = a.marketValue - a.costBasis;
    const d2 = b.marketValue - b.costBasis;
    const crosses = d1 * d2 < 0;
    if (!crosses) continue;

    const denom = b.marketValue - a.marketValue - (b.costBasis - a.costBasis);
    if (denom === 0) continue;
    const t = (a.costBasis - a.marketValue) / denom;
    if (t <= 0 || t >= 1) continue;

    const aMs = toChartTimestamp(a.date);
    const bMs = toChartTimestamp(b.date);
    const crossMarket = a.marketValue + (b.marketValue - a.marketValue) * t;
    const crossCost = a.costBasis + (b.costBasis - a.costBasis) * t;
    out.push({
      date: new Date(aMs + (bMs - aMs) * t).toISOString().slice(0, 10),
      timestamp: aMs + (bMs - aMs) * t,
      marketValue: crossMarket,
      costBasis: crossCost,
      mvAbove: crossMarket,
      mvBelow: crossMarket,
      isCrossPoint: true,
    });
  }

  out.push(toColoredMarketPoint(series[series.length - 1]));
  return out;
}
