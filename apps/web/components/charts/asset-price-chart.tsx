"use client";

import { useMemo, useState } from "react";
import { Area } from "recharts";
import { useAmountDisplay } from "@/lib/hooks/use-amount-display";
import { useAssetPriceHistory } from "@/lib/hooks/use-asset-price-history";
import {
  formatChartDate,
  getChartSeriesMin,
  PERIOD_HEADER_LABELS,
  toChartTimestamp,
  type Period,
} from "@/components/charts/chart-utils";
import { CommonChartCard } from "@/components/charts/common-chart-card";
import { MoneyText } from "@/components/ui/money-text";
import type { Asset, Transaction, TransactionType } from "@networth/types";

interface Props {
  asset: Asset;
  height?: number;
  transactions?: Transaction[];
}

interface ChartPoint {
  date: string;
  timestamp: number;
  price: number;
  transactions?: Transaction[];
}

const TX_COLOR: Record<TransactionType, string> = {
  buy: "var(--pos)",
  sell: "var(--neg)",
  dividend: "var(--accent)",
  deposit: "var(--pos)",
  withdrawal: "var(--neg)",
  split: "var(--ink-faint)",
};

const TX_LABEL: Record<TransactionType, string> = {
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  split: "Split",
};

function markerColor(txs: Transaction[]): string {
  const types = new Set(txs.map((t) => t.transaction_type));
  if (types.size === 1) return TX_COLOR[txs[0].transaction_type] ?? "var(--accent)";
  return "var(--accent)";
}

function buildChartData(
  points: Array<{ date: string; price: number }>,
  transactions: Transaction[],
): ChartPoint[] {
  const data: ChartPoint[] = points.map((p) => ({
    ...p,
    timestamp: toChartTimestamp(p.date),
  }));

  if (!transactions.length || !data.length) return data;

  const chartStartDate = data[0].date;
  const chartEndDate = data[data.length - 1].date;

  // Group transactions by date, filtering to chart range
  const txByDate = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const date = tx.executed_at.slice(0, 10);
    if (date < chartStartDate || date > chartEndDate) continue;
    const existing = txByDate.get(date);
    if (existing) existing.push(tx);
    else txByDate.set(date, [tx]);
  }

  if (!txByDate.size) return data;

  const chartDateSet = new Set(data.map((p) => p.date));

  // Attach transactions to exact matching chart points
  for (let i = 0; i < data.length; i++) {
    const txs = txByDate.get(data[i].date);
    if (txs) {
      data[i] = { ...data[i], transactions: txs };
      txByDate.delete(data[i].date);
    }
  }

  // For unmatched tx dates (weekends/holidays), find nearest chart point
  for (const [date, txs] of txByDate) {
    const targetTs = toChartTimestamp(date);
    let nearestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(data[i].timestamp - targetTs);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    }
    const prev = data[nearestIdx].transactions ?? [];
    data[nearestIdx] = { ...data[nearestIdx], transactions: [...prev, ...txs] };
  }

  return data;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: ChartPoint }>;
  label?: number;
  currency: string;
  displayPrice: (value: number, currency: string) => string;
  period: Period;
}

function PriceTooltip({ active, payload, label, currency, displayPrice, period }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const txs = point.transactions;
  const dateStr = label != null ? new Date(label).toISOString().slice(0, 10) : "";

  return (
    <div
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        fontSize: 12,
        padding: "8px 12px",
        minWidth: 150,
      }}
    >
      <div style={{ color: "var(--ink-faint)", marginBottom: 4 }}>
        {formatChartDate(dateStr, period)}
      </div>
      <div style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", marginBottom: txs?.length ? 8 : 0 }}>
        {displayPrice(payload[0].value, currency)}
      </div>
      {txs?.map((tx, i) => (
        <div
          key={tx.id}
          style={{
            borderTop: i === 0 ? "1px solid var(--color-border)" : undefined,
            paddingTop: i === 0 ? 8 : 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: TX_COLOR[tx.transaction_type] ?? "var(--accent)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: TX_COLOR[tx.transaction_type] ?? "var(--accent)",
                fontWeight: 600,
              }}
            >
              {TX_LABEL[tx.transaction_type] ?? tx.transaction_type}
            </span>
          </div>
          {tx.quantity !== 0 && (
            <div style={{ color: "var(--ink-faint)", paddingLeft: 14 }}>
              {tx.quantity} @ {displayPrice(tx.price, tx.currency)}
            </div>
          )}
          {tx.notes && (
            <div style={{ color: "var(--ink-faint)", paddingLeft: 14, marginTop: 2 }}>
              {tx.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function AssetPriceChart({ asset, height = 320, transactions = [] }: Props) {
  const [period, setPeriod] = useState<Period>("1y");
  const { displayPrice } = useAmountDisplay();
  const { points, currency, loading, error } = useAssetPriceHistory(asset, period);

  const chartData: ChartPoint[] = useMemo(
    () => buildChartData(points, transactions),
    [points, transactions],
  );

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

  const renderTooltip = (props: any) => (
    <PriceTooltip
      {...props}
      currency={currency}
      displayPrice={displayPrice}
      period={period}
    />
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
      tooltipContent={renderTooltip}
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
        dot={(props: any) => {
          const { cx, cy, payload } = props;
          if (!payload?.transactions?.length) return null;
          const color = markerColor(payload.transactions);
          return (
            <g key={`tx-dot-${props.index}`}>
              <circle
                cx={cx}
                cy={cy}
                r={7}
                fill="var(--color-card)"
                stroke={color}
                strokeWidth={2}
              />
              <circle cx={cx} cy={cy} r={3} fill={color} />
            </g>
          );
        }}
        activeDot={(props: any) => {
          const { cx, cy, payload } = props;
          const hasTx = payload?.transactions?.length;
          const color = hasTx ? markerColor(payload.transactions) : "var(--accent)";
          return (
            <circle
              key={`active-dot-${props.index}`}
              cx={cx}
              cy={cy}
              r={hasTx ? 7 : 4}
              fill={color}
              stroke="var(--color-card)"
              strokeWidth={2}
            />
          );
        }}
      />
    </CommonChartCard>
  );
}
