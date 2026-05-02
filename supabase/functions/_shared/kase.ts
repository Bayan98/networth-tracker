const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ru-KZ,ru;q=0.9,kk;q=0.8,en;q=0.7",
  "Referer": "https://kase.kz/en/shares/",
};

const API_HEADERS = {
  "User-Agent": "okhttp/4.11.0",
  "Accept": "application/json",
  "X-Requested-With": "kz.kase.mobile",
  "Accept-Language": "ru-KZ",
};

// Candidate REST API base URLs used by KASE Mobile (without auth).
// Probed in order; first one that returns valid JSON wins and is remembered.
const API_BASES = [
  "https://api.kase.kz",
  "https://kase.kz/api",
];

type KaseResult = { price: number | null; name: string | null };

export async function fetchKasePrice(tickerWithKz: string): Promise<number | null> {
  const result = await fetchKase(tickerWithKz);
  return result?.price ?? null;
}

export async function fetchKaseInfo(tickerWithKz: string): Promise<{ name: string | null; price: number | null; currency: "KZT" } | null> {
  const result = await fetchKase(tickerWithKz);
  if (!result) return null;
  return { name: result.name, price: result.price, currency: "KZT" };
}

async function fetchKase(tickerWithKz: string): Promise<KaseResult | null> {
  const ticker = tickerWithKz.replace(/\.KZ$/i, "").toUpperCase();

  // 1. Try JSON API candidates (KASE Mobile backend, no auth required)
  for (const base of API_BASES) {
    const endpoints = [
      `${base}/v1/securities/${ticker}`,
      `${base}/v1/securities/${ticker}/quote`,
      `${base}/v1/shares/${ticker}`,
      `${base}/v2/securities/${ticker}`,
      `${base}/shares/${ticker}`,
      `${base}/quotes?ticker=${ticker}`,
      `${base}/v1/quotes?ticker=${ticker}`,
    ];
    for (const url of endpoints) {
      const r = await tryJsonEndpoint(url);
      if (r) {
        console.log(`KASE: found price for ${ticker} via ${url}`);
        return r;
      }
    }
  }

  // 2. Fall back to KASE website HTML scraping (Next.js SSR page)
  return await scrapeKasePage(ticker);
}

async function tryJsonEndpoint(url: string): Promise<KaseResult | null> {
  try {
    const res = await fetch(url, { headers: API_HEADERS, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return null;
    const data = await res.json() as unknown;
    return extractFromJson(data);
  } catch {
    return null;
  }
}

async function scrapeKasePage(ticker: string): Promise<KaseResult | null> {
  const urls = [
    `https://kase.kz/en/shares/show/${ticker}/`,
    `https://kase.kz/en/investors/shares/${ticker}`,
    `https://kase.kz/en/issuers/${ticker}/`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const html = await res.text();
      const result = extractFromHtml(html);
      if (result?.price) {
        console.log(`KASE: scraped price for ${ticker} from ${url}`);
        return result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractFromHtml(html: string): KaseResult | null {
  // Next.js embeds all page data in __NEXT_DATA__ — primary target
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]) as Record<string, unknown>;
      const props = (data?.props as Record<string, unknown>)?.pageProps;
      if (props) {
        const r = extractFromJson(props);
        if (r?.price) return r;
      }
    } catch { /* ignore */ }
  }

  // Any application/json script blocks
  for (const m of html.matchAll(/<script[^>]+type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const r = extractFromJson(JSON.parse(m[1]) as unknown);
      if (r?.price) return r;
    } catch { /* ignore */ }
  }

  // Raw regex fallbacks for common API response patterns embedded in HTML
  const pricePatterns = [
    /"lastPrice"\s*:\s*([\d.]+)/,
    /"last_price"\s*:\s*([\d.]+)/,
    /"closePrice"\s*:\s*([\d.]+)/,
    /"close_price"\s*:\s*([\d.]+)/,
    /"last"\s*:\s*([\d.]+)/,
    /"price"\s*:\s*([\d.]+)/,
    /"close"\s*:\s*([\d.]+)/,
  ];
  for (const pattern of pricePatterns) {
    const m = html.match(pattern);
    if (m) {
      const price = parseFloat(m[1]);
      if (price > 0) return { price, name: null };
    }
  }

  return null;
}

function extractFromJson(data: unknown, depth = 0): KaseResult | null {
  if (depth > 8 || data == null || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Price field names in order of specificity
  const priceKeys = ["lastPrice", "last_price", "closePrice", "close_price", "last", "price", "close", "c"];
  let price: number | null = null;
  for (const key of priceKeys) {
    const val = obj[key];
    if (typeof val === "number" && val > 0) { price = val; break; }
    if (typeof val === "string") {
      const n = parseFloat(val.replace(",", ".").replace(/\s/g, ""));
      if (n > 0) { price = n; break; }
    }
  }

  const nameKeys = ["name", "fullName", "full_name", "shortName", "short_name", "companyName", "issuerName"];
  let name: string | null = null;
  for (const key of nameKeys) {
    const val = obj[key];
    if (typeof val === "string" && val.length > 1) { name = val; break; }
  }

  if (price != null) return { price, name };

  // Recurse into nested objects/arrays
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        const r = extractFromJson(item, depth + 1);
        if (r?.price) return r;
      }
    } else if (typeof val === "object") {
      const r = extractFromJson(val, depth + 1);
      if (r?.price) return r;
    }
  }

  return null;
}
