import { type DataArray, resolveDataRef, SA_HEADERS } from "./http.ts";
import { stockAnalysisBaseUrls, stockAnalysisUrl } from "./symbols.ts";
import type { SAInfo, StockAnalysisNewsItem } from "./types.ts";

function emptyInfo(): SAInfo {
  return {
    pe: null,
    eps: null,
    sector: null,
    industry: null,
    country: null,
    description: null,
    analystRating: null,
    analystCount: null,
    dividend: null,
    beta: null,
    news: null,
  };
}

export async function fetchStockAnalysisInfo(sym: string, assetType?: string): Promise<SAInfo> {
  try {
    for (const base of stockAnalysisBaseUrls(sym, assetType)) {
      const info = await fetchStockAnalysisInfoFromBase(base);
      if (hasStockAnalysisInfo(info)) return info;
    }
  } catch (e) {
    console.log(`SA fetchStockAnalysisInfo error for ${sym}:`, String(e));
  }
  return emptyInfo();
}

export async function fetchStockAnalysisNews(symbol: string, assetType?: string): Promise<StockAnalysisNewsItem[] | null> {
  const info = await fetchStockAnalysisInfo(symbol, assetType);
  return Array.isArray(info.news) && info.news.length > 0 ? info.news : null;
}

async function fetchStockAnalysisInfoFromBase(base: string): Promise<SAInfo> {
  const empty = emptyInfo();

  try {
    const [quoteRes, statsRes] = await Promise.all([
      fetch(`${base}/__data.json`, { headers: SA_HEADERS }),
      fetch(`${base}/__data.json?x-sveltekit-invalidated=001`, { headers: SA_HEADERS }),
    ]);

    if (!statsRes.ok) {
      await quoteRes.body?.cancel();
      await statsRes.body?.cancel();
      return empty;
    }

    let country: string | null = null;
    if (quoteRes.ok) {
      const qnd = await quoteRes.json() as { nodes?: Array<{ data?: unknown[] }> };
      const qdata = qnd?.nodes?.[1]?.data;
      if (Array.isArray(qdata) && qdata[1] && typeof qdata[1] === "object") {
        const infoObj = qdata[1] as Record<string, unknown>;
        const cRaw = resolveDataRef(qdata, infoObj["country"]);
        if (typeof cRaw === "string" && cRaw) country = cRaw;
      }
    } else {
      await quoteRes.body?.cancel();
    }

    const nd = await statsRes.json() as { nodes?: Array<{ data?: unknown[] }> };
    const data = nd?.nodes?.[2]?.data;
    if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") return empty;
    const root = data[0] as Record<string, unknown>;

    const get = (key: string): unknown => {
      const idx = root[key];
      if (typeof idx !== "number" || idx < 0 || idx >= data.length) return null;
      return data[idx];
    };

    const parseNumStr = (key: string): number | null => {
      const val = get(key);
      if (typeof val !== "string" || val === "n/a" || val === "-" || val === "") return null;
      const n = parseFloat(val.replace(/,/g, "").replace(/[^0-9.-]/g, ""));
      return isFinite(n) && n > 0 ? n : null;
    };

    const { sector, industry } = parseInfoTable(data, get("infoTable"));
    const description = parseDescription(get("description"));
    const dividendRaw = get("dividend");
    const dividend = typeof dividendRaw === "string" && dividendRaw !== "n/a" && dividendRaw !== "-" ? dividendRaw : null;
    const betaRaw = get("beta");
    const beta = typeof betaRaw === "string" && betaRaw !== "n/a" ? parseFloat(betaRaw) || null : null;
    const { analystRating, analystCount } = parseAnalysts(data, get("analysts"), get("analystChart"));

    return {
      pe: parseNumStr("peRatio"),
      eps: parseNumStr("eps"),
      sector,
      industry,
      country,
      description,
      analystRating,
      analystCount,
      dividend,
      beta,
      news: parseNews(data, get("news")),
    };
  } catch {
    return empty;
  }
}

function parseInfoTable(data: DataArray, infoTableRaw: unknown): { sector: string | null; industry: string | null } {
  let sector: string | null = null;
  let industry: string | null = null;
  if (!Array.isArray(infoTableRaw)) return { sector, industry };

  for (const rowRef of infoTableRaw) {
    const row = typeof rowRef === "number" ? data[rowRef] : rowRef;
    if (!row || typeof row !== "object") continue;
    const rowObj = row as Record<string, unknown>;
    const title = typeof rowObj.t === "number" ? data[rowObj.t] : rowObj.t;
    const value = typeof rowObj.v === "number" ? data[rowObj.v] : rowObj.v;
    if (title === "Sector" && typeof value === "string" && value) sector = value;
    if (title === "Industry" && typeof value === "string" && value) industry = value;
  }
  return { sector, industry };
}

function parseDescription(descRaw: unknown): string | null {
  return typeof descRaw === "string" && descRaw.length > 0
    ? descRaw.replace(/<[^>]*>/g, "").slice(0, 500) || null
    : null;
}

function parseAnalysts(
  data: DataArray,
  analystStr: unknown,
  chartRaw: unknown,
): { analystRating: string | null; analystCount: number | null } {
  if (typeof analystStr !== "string" || analystStr === "n/a") {
    return { analystRating: null, analystCount: null };
  }

  let analystCount: number | null = null;
  if (chartRaw && typeof chartRaw === "object") {
    const chart = chartRaw as Record<string, unknown>;
    let total = 0;
    for (const key of ["strongBuy", "buy", "hold", "sell", "strongSell"]) {
      const value = typeof chart[key] === "number" ? data[chart[key] as number] : chart[key];
      if (typeof value === "number") total += value;
    }
    if (total > 0) analystCount = total;
  }

  return { analystRating: analystStr, analystCount };
}

function parseNews(data: DataArray, newsRaw: unknown): SAInfo["news"] {
  if (!newsRaw || typeof newsRaw !== "object") return null;
  const newsObj = newsRaw as Record<string, unknown>;
  const newsArr = typeof newsObj.data === "number" ? data[newsObj.data] : null;
  if (!Array.isArray(newsArr)) return null;

  const items = newsArr.slice(0, 10).flatMap((rowRef) => {
    const row = typeof rowRef === "number" ? data[rowRef] : rowRef;
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const url = typeof r.url === "number" ? data[r.url] : r.url;
    const title = typeof r.title === "number" ? data[r.title] : r.title;
    const source = typeof r.source === "number" ? data[r.source] : r.source;
    const time = typeof r.time === "number" ? data[r.time] : r.time;
    if (!url || !title) return [];
    const ts = typeof time === "string" ? new Date(time).getTime() : 0;
    return [{ title: String(title), publisher: String(source ?? ""), link: stockAnalysisUrl(String(url)), publishedAt: ts }];
  });

  return items.length > 0 ? items : null;
}

function hasStockAnalysisInfo(info: SAInfo): boolean {
  return info.pe != null ||
    info.eps != null ||
    info.sector != null ||
    info.industry != null ||
    info.country != null ||
    info.description != null ||
    info.analystRating != null ||
    info.analystCount != null ||
    info.dividend != null ||
    info.beta != null ||
    info.news != null;
}
