import { normalizePriceCurrency } from "./currency.ts";
import { type DataArray, resolveDataRef, SA_HEADERS } from "./http.ts";
import { stockAnalysisBaseUrls } from "./symbols.ts";
import type { SAResult } from "./types.ts";

function parseQuote(data: DataArray): SAResult {
  const info = data[1];
  if (!info || typeof info !== "object") {
    return { price: null, name: null, currency: null, rawCurrency: null, description: null };
  }

  const infoObj = info as Record<string, unknown>;
  const quote = resolveDataRef(data, infoObj["quote"]);
  const quoteObj = quote && typeof quote === "object" ? quote as Record<string, unknown> : null;

  let price: number | null = null;
  if (quoteObj) {
    const raw = resolveDataRef(data, quoteObj["p"]);
    if (typeof raw === "number" && raw > 0) price = raw;
  }

  const nameRaw = resolveDataRef(data, infoObj["name"] ?? infoObj["nameFull"]);
  const name = typeof nameRaw === "string" ? nameRaw : null;

  const currRaw = resolveDataRef(data, infoObj["curr"]);
  let rawCurrency: string | null = null;
  if (typeof currRaw === "string") {
    rawCurrency = currRaw.toUpperCase();
  } else if (currRaw && typeof currRaw === "object") {
    const currObj = currRaw as Record<string, unknown>;
    const resolved = resolveDataRef(data, currObj["price"]);
    if (typeof resolved === "string") rawCurrency = resolved.toUpperCase();
  }

  const descRaw = resolveDataRef(data, infoObj["description"] ?? infoObj["bio"]);
  const description = typeof descRaw === "string" ? descRaw.replace(/<[^>]*>/g, "").slice(0, 500) || null : null;

  if (price !== null && rawCurrency !== null) {
    const normalized = normalizePriceCurrency(price, rawCurrency);
    return { price: normalized.price, name, currency: normalized.currency, rawCurrency, description };
  }
  return { price, name, currency: rawCurrency, rawCurrency, description };
}

export async function fetchStockAnalysisQuote(sym: string, assetType?: string): Promise<SAResult> {
  const empty: SAResult = { price: null, name: null, currency: null, rawCurrency: null, description: null };

  for (const base of stockAnalysisBaseUrls(sym, assetType)) {
    try {
      const res = await fetch(`${base}/__data.json`, { headers: SA_HEADERS });
      if (!res.ok) {
        await res.body?.cancel();
        continue;
      }

      const nd = await res.json() as { nodes?: Array<{ data?: unknown[] }> };
      const data = nd?.nodes?.[1]?.data;
      if (!Array.isArray(data)) continue;

      return parseQuote(data);
    } catch (e) {
      console.log(`SA fetchStockAnalysisQuote error for ${sym}:`, String(e));
    }
  }
  return empty;
}
