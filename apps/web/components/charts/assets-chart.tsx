"use client";

import type { CurrencyCode } from "@networth/types";
import { useAmountDisplay } from "@/lib/hooks/use-amount-display";
import {
  getChartSeriesMin,
  splitMarketValueSeries,
  type Period,
} from "@/components/charts/chart-utils";
import {
  CommonChartCard,
  renderCommonMarketValueAreas,
} from "@/components/charts/common-chart-card";
import type { SeriesPoint } from "@/lib/hooks/use-portfolio-history";

interface Props {
  series: SeriesPoint[];
  currency: CurrencyCode;
  loading: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
  height?: number;
}

export function AssetsChart({
  series,
  currency,
  loading,
  period,
  onPeriodChange,
  height = 320,
}: Props) {
  const { displayPrice } = useAmountDisplay();
  const chartData = splitMarketValueSeries(series);
  const seriesMin = getChartSeriesMin(series, (point) => [
    point.costBasis,
    point.marketValue,
  ]);
  const header = (
    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>
      Portfolio Performance
    </div>
  );
  const emptyContent = (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-faint)",
        fontSize: 13,
      }}
    >
      Add transactions to see performance.
    </div>
  );

  return (
    <CommonChartCard
      header={header}
      data={chartData}
      currency={currency}
      loading={loading}
      period={period}
      onPeriodChange={onPeriodChange}
      seriesMin={seriesMin}
      height={height}
      emptyContent={emptyContent}
      tooltipFormatter={(value: number, name: string) => [
        displayPrice(value, currency),
        name === "costBasis" ? "Invested" : "Market Value",
      ]}
    >
      {renderCommonMarketValueAreas({ idPrefix: "assets", seriesMin })}
    </CommonChartCard>
  );
}
