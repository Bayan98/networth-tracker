"use client";

import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { CurrencyCode } from "@networth/types";
import { useAmountDisplay } from "@/lib/hooks/use-amount-display";
import { ChartLineLoading } from "@/components/charts/chart-line-loading";
import {
  CHART_TOOLTIP_STYLE,
  PERIOD_LABELS,
  PERIODS,
  formatChartDate,
  type Period,
} from "@/components/charts/chart-utils";

interface Props {
  header: ReactNode;
  data: Array<{ timestamp: number }>;
  currency: CurrencyCode;
  loading: boolean;
  period: Period;
  onPeriodChange: (period: Period) => void;
  seriesMin: number;
  height?: number;
  emptyContent: ReactNode;
  defs?: ReactNode;
  children: ReactNode;
  tooltipFormatter: (value: number, name: string) => [string, string];
}

export function CommonChartCard({
  header,
  data,
  currency,
  loading,
  period,
  onPeriodChange,
  seriesMin,
  height = 320,
  emptyContent,
  defs,
  children,
  tooltipFormatter,
}: Props) {
  const { displayPrice } = useAmountDisplay();
  const isEmpty = !loading && data.length === 0;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="chart-header">
        {header}

        <div className="segmented" style={{ flexShrink: 0 }}>
          {PERIODS.map((periodOption) => (
            <button
              key={periodOption}
              onClick={() => onPeriodChange(periodOption)}
              className={period === periodOption ? "active" : ""}
            >
              {PERIOD_LABELS[periodOption]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height, paddingBottom: 20 }}>
        {loading ? (
          <ChartLineLoading />
        ) : isEmpty ? (
          emptyContent
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
            >
              {defs}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
                strokeOpacity={0.7}
              />
              <XAxis
                type="number"
                dataKey="timestamp"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(value: number) =>
                  formatChartDate(
                    new Date(value).toISOString().slice(0, 10),
                    period,
                  )
                }
                tick={{
                  fontSize: 10,
                  fill: "var(--ink-faint)",
                  fontFamily: "var(--font-mono)",
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={52}
              />
              <YAxis
                tickFormatter={(value: number) =>
                  displayPrice(value, currency, { compact: true })
                }
                tick={{
                  fontSize: 10,
                  fill: "var(--ink-faint)",
                  fontFamily: "var(--font-mono)",
                }}
                axisLine={false}
                tickLine={false}
                width={60}
                domain={[seriesMin, "auto"]}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={(value: number) =>
                  formatChartDate(
                    new Date(value).toISOString().slice(0, 10),
                    period,
                  )
                }
                formatter={tooltipFormatter}
              />
              {children}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface CommonMarketValueAreasProps {
  idPrefix: string;
  seriesMin: number;
}

export function renderCommonMarketValueAreas({
  idPrefix,
  seriesMin,
}: CommonMarketValueAreasProps) {
  const cbFillId = `${idPrefix}CbFill`;
  const mvFillGreenId = `${idPrefix}MvFillGreen`;
  const mvFillRedId = `${idPrefix}MvFillRed`;

  return [
    <defs key="defs">
      <linearGradient id={cbFillId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--ink-faint)" stopOpacity={0.08} />
        <stop offset="95%" stopColor="var(--ink-faint)" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={mvFillGreenId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--pos)" stopOpacity={0.18} />
        <stop offset="100%" stopColor="var(--pos)" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id={mvFillRedId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--neg)" stopOpacity={0.18} />
        <stop offset="100%" stopColor="var(--neg)" stopOpacity={0.02} />
      </linearGradient>
    </defs>,
    <Area
      key="costBasis"
      type="monotone"
      dataKey="costBasis"
      stroke="var(--border-strong)"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      strokeOpacity={0.7}
      fill={`url(#${cbFillId})`}
      baseValue={seriesMin}
      dot={false}
    />,
    <Area
      key="mvAbove"
      type="monotone"
      dataKey="mvAbove"
      connectNulls={false}
      stroke="var(--pos)"
      strokeWidth={2}
      fill={`url(#${mvFillGreenId})`}
      baseValue={seriesMin}
      dot={false}
    />,
    <Area
      key="mvBelow"
      type="monotone"
      dataKey="mvBelow"
      connectNulls={false}
      stroke="var(--neg)"
      strokeWidth={2}
      fill={`url(#${mvFillRedId})`}
      baseValue={seriesMin}
      dot={false}
    />,
  ];
}
