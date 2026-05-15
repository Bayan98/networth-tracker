"use client";

import { AssetPriceChart } from "@/components/charts/asset-price-chart";
import type { Asset } from "@networth/types";

interface Props {
  asset: Asset;
}

export function AssetChartsTab({ asset }: Props) {
  return <AssetPriceChart asset={asset} />;
}
