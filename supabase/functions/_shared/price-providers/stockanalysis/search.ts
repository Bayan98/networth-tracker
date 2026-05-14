import { SA_HEADERS } from "./http.ts";
import type { StockAnalysisSearchResult } from "./types.ts";

export async function searchStockAnalysis(query: string): Promise<StockAnalysisSearchResult[]> {
  try {
    const url = `https://stockanalysis.com/api/search/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        ...SA_HEADERS,
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://stockanalysis.com",
      },
    });
    if (!res.ok) {
      console.log("StockAnalysis search status:", res.status);
      await res.body?.cancel();
      return [];
    }

    const raw = await res.json() as { data?: unknown[]; results?: unknown[] } | unknown[];
    const items = Array.isArray(raw) ? raw : (raw.data ?? raw.results ?? []);
    return items
      .slice(0, 15)
      .map(mapSearchItem)
      .filter((result): result is StockAnalysisSearchResult => Boolean(result?.symbol && result.name));
  } catch (e) {
    console.log("StockAnalysis search error:", String(e));
    return [];
  }
}

function mapSearchItem(item: unknown): StockAnalysisSearchResult | null {
  if (!item || typeof item !== "object") return null;
  const value = item as Record<string, unknown>;
  const rawSym = String(value.s ?? value.symbol ?? "");
  const slashIdx = rawSym.indexOf("/");
  const ticker = slashIdx >= 0 ? rawSym.slice(slashIdx + 1).toUpperCase() : rawSym.toUpperCase();
  const exchange = slashIdx >= 0
    ? rawSym.slice(0, slashIdx).toUpperCase()
    : typeof value.e === "string"
    ? value.e
    : typeof value.exchange === "string"
    ? value.exchange
    : undefined;

  return {
    symbol: ticker,
    name: String(value.n ?? value.name ?? ""),
    exchange: exchange || undefined,
    type: typeof value.t === "string" ? value.t : typeof value.type === "string" ? value.type : undefined,
  };
}
