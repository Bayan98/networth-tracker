"use client";

import { AssetPriceChart } from "@/components/charts/asset-price-chart";
import type { Asset, Transaction } from "@networth/types";

interface Props {
  asset: Asset;
  transactions: Transaction[];
}

export function AssetChartsTab({ asset, transactions }: Props) {
  return <AssetPriceChart asset={asset} transactions={transactions} />;
}
