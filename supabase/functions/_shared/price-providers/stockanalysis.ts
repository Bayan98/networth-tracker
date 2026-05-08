/** Minor currency units returned by StockAnalysis that must be converted to their major counterpart. */
export const MINOR_CURRENCIES: Record<string, { major: string; factor: number }> = {
  GBX: { major: "GBP", factor: 100 }, // British pence → pounds
  ILA: { major: "ILS", factor: 100 }, // Israeli agorot → shekels
  ZAC: { major: "ZAR", factor: 100 }, // South African cents → rand
}

/** Normalize a minor currency unit to its major counterpart (e.g. 123 GBX → 1.23 GBP). */
export function normalizePriceCurrency(
  price: number,
  currency: string,
): { price: number; currency: string } {
  const m = MINOR_CURRENCIES[currency.toUpperCase()]
  return m ? { price: price / m.factor, currency: m.major } : { price, currency }
}

const SA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://stockanalysis.com/",
};

export interface SAResult {
  price: number | null;
  name: string | null;
  /** Normalized major currency (e.g. 'GBP'). Use this for FX lookups. */
  currency: string | null;
  /** Raw currency as returned by StockAnalysis (e.g. 'GBX'). Use to normalize historical prices. */
  rawCurrency: string | null;
  description: string | null;
}

export interface PricePoint {
  date: string;
  price: number;
}

export function parseSymbol(sym: string): { exchange: string | null; ticker: string } {
  const idx = sym.indexOf(":");
  if (idx > 0) return { exchange: sym.slice(0, idx).toUpperCase(), ticker: sym.slice(idx + 1).toUpperCase() };
  return { exchange: null, ticker: sym.toUpperCase() };
}

function saBaseUrl(sym: string, assetType?: string): string {
  const { exchange, ticker } = parseSymbol(sym);
  if (exchange) return `https://stockanalysis.com/quote/${exchange.toLowerCase()}/${ticker.toLowerCase()}`;
  if (assetType === "etf") return `https://stockanalysis.com/etf/${ticker.toLowerCase()}`;
  if (assetType === "crypto") return `https://stockanalysis.com/crypto/${ticker.toLowerCase()}`;
  return `https://stockanalysis.com/stocks/${ticker.toLowerCase()}`;
}

type DataArray = unknown[];

function res(data: DataArray, val: unknown): unknown {
  if (typeof val === "number" && val >= 0 && val < data.length) return data[val];
  return val;
}

function saParseQuote(data: DataArray): { price: number | null; name: string | null; currency: string | null; rawCurrency: string | null; description: string | null } {
  const info = data[1];
  if (!info || typeof info !== "object") return { price: null, name: null, currency: null, rawCurrency: null, description: null };

  const infoObj = info as Record<string, unknown>;
  const quote = res(data, infoObj["quote"]);
  const quoteObj = (quote && typeof quote === "object") ? quote as Record<string, unknown> : null;

  let price: number | null = null;
  if (quoteObj) {
    const raw = res(data, quoteObj["p"]);
    if (typeof raw === "number" && raw > 0) price = raw;
  }

  const nameRaw = res(data, infoObj["name"] ?? infoObj["nameFull"]);
  const name = typeof nameRaw === "string" ? nameRaw : null;

  const currRaw = res(data, infoObj["curr"]);
  let rawCurrency: string | null = null;
  if (typeof currRaw === "string") {
    rawCurrency = currRaw.toUpperCase();
  } else if (currRaw && typeof currRaw === "object") {
    const currObj = currRaw as Record<string, unknown>;
    const priceIdx = currObj["price"];
    const resolved = res(data, priceIdx);
    if (typeof resolved === "string") rawCurrency = resolved.toUpperCase();
  }

  const descRaw = res(data, infoObj["description"] ?? infoObj["bio"]);
  const description = typeof descRaw === "string" ? descRaw.replace(/<[^>]*>/g, "").slice(0, 500) || null : null;

  if (price !== null && rawCurrency !== null) {
    const normed = normalizePriceCurrency(price, rawCurrency)
    return { price: normed.price, name, currency: normed.currency, rawCurrency, description }
  }
  return { price, name, currency: rawCurrency, rawCurrency, description };
}

export async function fetchStockAnalysisQuote(sym: string, assetType?: string): Promise<SAResult> {
  const base = saBaseUrl(sym, assetType);
  const empty: SAResult = { price: null, name: null, currency: null, rawCurrency: null, description: null };

  try {
    const res_ = await fetch(`${base}/__data.json`, { headers: SA_HEADERS });
    if (!res_.ok) return empty;

    // deno-lint-ignore no-explicit-any
    const nd = await res_.json() as any;
    const data: DataArray = nd?.nodes?.[1]?.data;
    if (!Array.isArray(data)) return empty;

    return saParseQuote(data);
  } catch (e) {
    console.log(`SA fetchStockAnalysisQuote error for ${sym}:`, String(e));
    return empty;
  }
}

export interface SAInfo {
  pe: number | null;
  eps: number | null;
  sector: string | null;
  country: string | null;
  description: string | null;
  analystRating: string | null;
  analystCount: number | null;
  dividend: string | null;
  beta: number | null;
  news: Array<{ title: string; publisher: string; link: string; publishedAt: number }> | null;
}

export async function fetchStockAnalysisInfo(sym: string, assetType?: string): Promise<SAInfo> {
  const base = saBaseUrl(sym, assetType);
  const empty: SAInfo = { pe: null, eps: null, sector: null, country: null, description: null, analystRating: null, analystCount: null, dividend: null, beta: null, news: null };

  try {
    const [quoteRes, statsRes] = await Promise.all([
      fetch(`${base}/__data.json`, { headers: SA_HEADERS }),
      fetch(`${base}/__data.json?x-sveltekit-invalidated=001`, { headers: SA_HEADERS }),
    ]);
    if (!statsRes.ok) return empty;

    // Extract country from quote node1
    let country: string | null = null;
    if (quoteRes.ok) {
      // deno-lint-ignore no-explicit-any
      const qnd = await quoteRes.json() as any;
      const qdata: DataArray = qnd?.nodes?.[1]?.data;
      if (Array.isArray(qdata) && qdata[1] && typeof qdata[1] === "object") {
        const infoObj = qdata[1] as Record<string, unknown>;
        const cRaw = res(qdata, infoObj["country"]);
        if (typeof cRaw === "string" && cRaw) country = cRaw;
      }
    }

    // deno-lint-ignore no-explicit-any
    const nd = await statsRes.json() as any;
    const data: DataArray = nd?.nodes?.[2]?.data;
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

    // Sector/industry from infoTable
    let sector: string | null = null;
    const infoTableRaw = get("infoTable");
    if (Array.isArray(infoTableRaw)) {
      for (const rowRef of infoTableRaw) {
        const row = typeof rowRef === "number" ? data[rowRef] : rowRef;
        if (!row || typeof row !== "object") continue;
        const rowObj = row as Record<string, unknown>;
        const t = typeof rowObj.t === "number" ? data[rowObj.t] : rowObj.t;
        const v = typeof rowObj.v === "number" ? data[rowObj.v] : rowObj.v;
        if (t === "Sector" && typeof v === "string" && v) sector = v;
        if (!sector && t === "Industry" && typeof v === "string" && v) sector = v;
      }
    }

    // Description
    const descRaw = get("description");
    const description = typeof descRaw === "string" && descRaw.length > 0
      ? descRaw.replace(/<[^>]*>/g, "").slice(0, 500) || null
      : null;

    // Dividend
    const dividendRaw = get("dividend");
    const dividend = typeof dividendRaw === "string" && dividendRaw !== "n/a" && dividendRaw !== "-"
      ? dividendRaw : null;

    // Beta
    const betaRaw = get("beta");
    const beta = typeof betaRaw === "string" && betaRaw !== "n/a"
      ? (parseFloat(betaRaw) || null) : null;

    // Analyst
    let analystRating: string | null = null;
    let analystCount: number | null = null;
    const analystStr = get("analysts");
    if (typeof analystStr === "string" && analystStr !== "n/a") {
      analystRating = analystStr;
      const chartRaw = get("analystChart");
      if (chartRaw && typeof chartRaw === "object") {
        const chart = chartRaw as Record<string, unknown>;
        let total = 0;
        for (const k of ["strongBuy", "buy", "hold", "sell", "strongSell"]) {
          const v = typeof chart[k] === "number" ? data[chart[k] as number] : chart[k];
          if (typeof v === "number") total += v;
        }
        if (total > 0) analystCount = total;
      }
    }

    // News
    let news: SAInfo["news"] = null;
    const newsRaw = get("news");
    if (newsRaw && typeof newsRaw === "object") {
      const newsObj = newsRaw as Record<string, unknown>;
      const newsArr = typeof newsObj.data === "number" ? data[newsObj.data] : null;
      if (Array.isArray(newsArr)) {
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
          return [{ title: String(title), publisher: String(source ?? ""), link: String(url), publishedAt: ts }];
        });
        if (items.length > 0) news = items;
      }
    }

    return {
      pe: parseNumStr("peRatio"),
      eps: parseNumStr("eps"),
      sector,
      country,
      description,
      analystRating,
      analystCount,
      dividend,
      beta,
      news,
    };
  } catch (e) {
    console.log(`SA fetchStockAnalysisInfo error for ${sym}:`, String(e));
    return empty;
  }
}

function saApiSymbol(sym: string): string {
  const { exchange, ticker } = parseSymbol(sym);
  return exchange ? `${exchange}-${ticker}` : ticker;
}

export async function fetchStockAnalysisHistory(
  sym: string,
  _assetType: string,
  fromTimestamp: number,
  toTimestamp: number,
  period?: string,
): Promise<PricePoint[]> {
  const apiSym = saApiSymbol(sym);
  const range = "5Y";
  const saperiod = period === "5y" ? "Monthly" : "Daily";

  try {
    const url = `https://stockanalysis.com/api/symbol/a/${apiSym}/history?range=${range}&period=${saperiod}`;
    const res_ = await fetch(url, { headers: SA_HEADERS });
    if (!res_.ok) return [];

    const json = await res_.json() as { data?: Array<{ t: string; c: number }> };
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
