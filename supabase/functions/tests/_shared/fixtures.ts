import type { RequestItem as HistoryRequestItem } from "../../fetch-price-history/index.ts";

export const FIXED_NOW = Date.parse("2026-05-08T12:00:00Z");

export const TEST_ITEMS: HistoryRequestItem[] = [
  { symbol: "KASE:HSBK", asset_type: "stock" },
  { symbol: "HKG:1810", asset_type: "stock" },
  { symbol: "AAPL", asset_type: "stock" },
  { symbol: "BTC", asset_type: "crypto" },
  { symbol: "VXUS", asset_type: "etf" },
];
