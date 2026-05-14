import { SA_HEADERS } from "./http.ts";
import { stockAnalysisApiSymbol } from "./symbols.ts";
import type { PricePoint } from "./types.ts";

export async function fetchStockAnalysisHistory(
  sym: string,
  _assetType: string,
  fromTimestamp: number,
  toTimestamp: number,
  period?: string,
): Promise<PricePoint[]> {
  const apiSym = stockAnalysisApiSymbol(sym);
  const range = "5Y";
  const saPeriod = period === "5y" ? "Monthly" : "Daily";

  try {
    const url = `https://stockanalysis.com/api/symbol/a/${apiSym}/history?range=${range}&period=${saPeriod}`;
    const res = await fetch(url, { headers: SA_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
      return [];
    }

    const json = await res.json() as { data?: Array<{ t: string; c: number }> };
    if (!Array.isArray(json?.data)) return [];

    return json.data
      .filter((row) => {
        const ts = new Date(row.t).getTime() / 1000;
        return row.c > 0 && ts >= fromTimestamp && ts <= toTimestamp;
      })
      .map((row) => ({ date: row.t.slice(0, 10), price: row.c }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.log(`SA fetchStockAnalysisHistory error for ${sym}:`, String(e));
    return [];
  }
}
