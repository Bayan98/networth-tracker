"use client";

import { useState } from "react";
import { Area } from "recharts";
import { useAmountDisplay } from "@/lib/hooks/use-amount-display";
import { useAssetPriceHistory } from "@/lib/hooks/use-asset-price-history";
import {
  getChartSeriesMin,
  PERIOD_HEADER_LABELS,
  toChartTimestamp,
  type Period,
} from "@/components/charts/chart-utils";
import { CommonChartCard } from "@/components/charts/common-chart-card";
import { MoneyText } from "@/components/ui/money-text";
import type { Asset } from "@networth/types";

interface Props {
  asset: Asset;
  height?: number;
}

interface ChartPoint {
  date: string;
  timestamp: number;
  price: number;
}

export function AssetPriceChart({ asset, height = 320 }: Props) {
  const [period, setPeriod] = useState<Period>("1y");
  const { displayPrice } = useAmountDisplay();
  const { points, currency, loading, error } = useAssetPriceHistory(
    asset,
    period,
  );
  const chartData: ChartPoint[] = points.map((point) => ({
    ...point,
    timestamp: toChartTimestamp(point.date),
  }));
  const latest = points.at(-1)?.price ?? null;
  const seriesMin = getChartSeriesMin(chartData, (point) => [point.price]);
  const header = (
    <div className="chart-header-stats">
      <div className="chart-header-stat">
        <div className="empty-label">
          Unit price · {currency} · {PERIOD_HEADER_LABELS[period]}
        </div>
        <div className="chart-header-big">
          <MoneyText
            value={latest}
            currency={currency}
            loading={loading}
            skelWidth={220}
            skelHeight={40}
          />
        </div>
      </div>
    </div>
  );
  const emptyContent = (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: error ? "var(--warn)" : "var(--ink-faint)",
        fontSize: 13,
      }}
    >
      {error ?? "No price history available for this asset."}
    </div>
  );

  return (
    <CommonChartCard
      header={header}
      data={chartData}
      currency={currency}
      loading={loading}
      period={period}
      onPeriodChange={setPeriod}
      seriesMin={seriesMin}
      height={height}
      emptyContent={emptyContent}
      defs={
        <defs>
          <linearGradient id="assetPriceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      }
      tooltipFormatter={(value: number) => [
        displayPrice(value, currency),
        "Unit Price",
      ]}
    >
      <Area
        type="monotone"
        dataKey="price"
        stroke="var(--accent)"
        strokeWidth={2}
        fill="url(#assetPriceFill)"
        baseValue={seriesMin}
        dot={false}
      />
    </CommonChartCard>
  );
}
