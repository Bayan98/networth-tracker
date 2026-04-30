import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNDAMENTALS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NEWS_TTL_MS = 6 * 60 * 60 * 1000;
const PRICEABLE = ["stock", "etf", "bond", "mutual_fund", "commodity", "crypto"];

interface Holding { symbol: string; name: string; pct: number }
interface NewsItem { title: string; publisher: string; link: string; publishedAt: number }
interface AssetInfo {
  sector: string | null; country: string | null;
  pe: number | null; eps: number | null;
  analystRating: string | null; analystCount: number | null;
  holdings: Holding[] | null; news: NewsItem[] | null; yahooUrl: string | null;
}

// deno-lint-ignore no-explicit-any
function parseNum(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "object" && typeof v.raw === "number") return isFinite(v.raw) ? v.raw : null;
  return null;
}

function computeRating(t: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }): string {
  const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell;
  if (total === 0) return "Hold";
  const score = (t.strongBuy * 2 + t.buy - t.sell - t.strongSell * 2) / total;
  if (score > 1.5) return "Strong Buy";
  if (score > 0.5) return "Buy";
  if (score > -0.5) return "Hold";
  if (score > -1.5) return "Sell";
  return "Strong Sell";
}

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  try {
    const fcRes = await fetch("https://fc.yahoo.com", {
      headers: { ...YAHOO_HEADERS, "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    const rawCookies = fcRes.headers.getSetCookie
      ? fcRes.headers.getSetCookie()
      : (fcRes.headers.get("set-cookie") ?? "").split(/,(?=[^;]+=[^;]+;)/);
    const cookieStr = rawCookies.map((c: string) => c.split(";")[0].trim()).filter(Boolean).join("; ");
    if (!cookieStr) return null;

    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...YAHOO_HEADERS, "Cookie": cookieStr },
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.startsWith("<") || crumb.length > 20) return null;
    return { crumb, cookie: cookieStr };
  } catch (e) {
    console.log("crumb error:", String(e));
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { symbol, asset_type } = await req.json() as { symbol: string; asset_type: string };
    const sym = symbol.toUpperCase().trim();

    if (!sym || !PRICEABLE.includes(asset_type)) {
      return json({ sector: null, country: null, pe: null, eps: null, analystRating: null, analystCount: null, holdings: null, news: null, yahooUrl: null });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = Date.now();
    const infoKey = `asset-info:v4:${sym}`;
    const newsKey = `asset-news:v4:${sym}`;

    const [{ data: cachedInfo }, { data: cachedNews }] = await Promise.all([
      supabase.from("api_cache").select("response, expires_at").eq("cache_key", infoKey).single(),
      supabase.from("api_cache").select("response, expires_at").eq("cache_key", newsKey).single(),
    ]);

    const infoFresh = cachedInfo?.expires_at && new Date(cachedInfo.expires_at).getTime() > now;
    const newsFresh = cachedNews?.expires_at && new Date(cachedNews.expires_at).getTime() > now;

    let info: Partial<AssetInfo> = {};
    let newsData: NewsItem[] | null = null;

    if (infoFresh) {
      info = cachedInfo!.response as Partial<AssetInfo>;
    } else {
      const yahooSym = asset_type === "crypto" ? `${sym}-USD` : sym;

      // Source 1: v1/finance/search — sector, industry, region, news
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v1/finance/search?q=${yahooSym}&quotesCount=1&newsCount=10&enableFuzzyQuery=false`,
          { headers: YAHOO_HEADERS },
        );
        if (res.ok) {
          const data = await res.json() as {
            quotes?: Array<{ symbol?: string; sector?: string; industry?: string; region?: string }>;
            news?: Array<{ title?: string; publisher?: string; link?: string; providerPublishTime?: number }>;
          };
          const q = data.quotes?.find((q) => q.symbol?.toUpperCase() === yahooSym.toUpperCase()) ?? data.quotes?.[0];
          if (q) {
            if (q.sector) info.sector = q.sector;
            if (q.industry && !info.sector) info.sector = q.industry;
            if (q.region) info.country = q.region;
          }
          if (!newsFresh && data.news?.length) {
            newsData = data.news
              .filter((n) => n.title && n.link)
              .map((n) => ({ title: n.title!, publisher: n.publisher ?? "", link: n.link!, publishedAt: (n.providerPublishTime ?? 0) * 1000 }));
          }
        }
      } catch (e) { console.log("search error:", String(e)); }

      // Source 2: v7/finance/quote — PE, EPS, sector fallback
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSym}&fields=trailingPE,epsTrailingTwelveMonths,sector,country`,
          { headers: YAHOO_HEADERS },
        );
        if (res.ok) {
          // deno-lint-ignore no-explicit-any
          const data = await res.json() as { quoteResponse?: { result?: any[] } };
          const q = data?.quoteResponse?.result?.[0];
          if (q) {
            const pe = parseNum(q.trailingPE);
            if (pe != null && pe > 0) info.pe = pe;
            const eps = parseNum(q.epsTrailingTwelveMonths);
            if (eps != null) info.eps = eps;
            if (!info.sector && q.sector) info.sector = q.sector;
            if (!info.country && q.country) info.country = q.country;
          }
        }
      } catch (e) { console.log("v7 error:", String(e)); }

      // Source 3: quoteSummary with crumb authentication
      const isHoldings = asset_type === "etf" || asset_type === "mutual_fund";
      const modules = isHoldings
        ? "summaryProfile,defaultKeyStatistics,recommendationTrend,topHoldings"
        : "summaryProfile,defaultKeyStatistics,recommendationTrend";

      const auth = await getYahooCrumb();
      if (auth) {
        const authHeaders = { ...YAHOO_HEADERS, "Cookie": auth.cookie };
        const summaryUrls = [
          `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooSym}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(auth.crumb)}&formatted=false`,
          `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSym}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(auth.crumb)}&formatted=false`,
        ];
        for (const url of summaryUrls) {
          if (info.analystRating && (!isHoldings || info.holdings)) break;
          try {
            const res = await fetch(url, { headers: authHeaders });
            if (!res.ok) { console.log("quoteSummary status:", res.status); continue; }
            // deno-lint-ignore no-explicit-any
            const data = await res.json() as { quoteSummary?: { result?: any[] | null } };
            const r = data?.quoteSummary?.result?.[0];
            if (!r) continue;

            if (!info.sector && r.summaryProfile?.sector) info.sector = r.summaryProfile.sector;
            if (!info.country && r.summaryProfile?.country) info.country = r.summaryProfile.country;

            if (info.pe == null) {
              const pe = parseNum(r.defaultKeyStatistics?.forwardPE ?? r.summaryDetail?.trailingPE);
              if (pe != null && pe > 0) info.pe = pe;
            }
            if (info.eps == null) {
              const eps = parseNum(r.defaultKeyStatistics?.trailingEps);
              if (eps != null) info.eps = eps;
            }

            const trend = r.recommendationTrend?.trend?.find((t: { period: string }) => t.period === "0m");
            if (trend) {
              const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
              if (total > 0) { info.analystRating = computeRating(trend); info.analystCount = total; }
            }

            if (isHoldings && r.topHoldings?.holdings?.length > 0) {
              const top20 = r.topHoldings.holdings.slice(0, 20);
              const rest = r.topHoldings.holdings.slice(20);
              const mapped: Holding[] = top20.map((h: { symbol?: string; holdingName?: string; holdingPercent?: unknown }) => ({
                symbol: h.symbol ?? "",
                name: h.holdingName ?? h.symbol ?? "",
                pct: parseNum(h.holdingPercent) ?? 0,
              }));
              if (rest.length > 0) {
                mapped.push({ symbol: "", name: "Other", pct: rest.reduce((s: number, h: { holdingPercent?: unknown }) => s + (parseNum(h.holdingPercent) ?? 0), 0) });
              }
              info.holdings = mapped;
            }
            break;
          } catch (e) { console.log("quoteSummary error:", String(e)); }
        }
      } else {
        // Fallback without crumb — try unauthenticated quoteSummary
        for (const url of [
          `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSym}?formatted=false&modules=${encodeURIComponent(modules)}&corsDomain=finance.yahoo.com`,
          `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooSym}?formatted=false&modules=${encodeURIComponent(modules)}&corsDomain=finance.yahoo.com`,
        ]) {
          if (info.analystRating && (!isHoldings || info.holdings)) break;
          try {
            const res = await fetch(url, { headers: YAHOO_HEADERS });
            if (!res.ok) continue;
            // deno-lint-ignore no-explicit-any
            const data = await res.json() as { quoteSummary?: { result?: any[] | null } };
            const r = data?.quoteSummary?.result?.[0];
            if (!r) continue;

            if (!info.sector && r.summaryProfile?.sector) info.sector = r.summaryProfile.sector;
            if (!info.country && r.summaryProfile?.country) info.country = r.summaryProfile.country;
            if (info.pe == null) {
              const pe = parseNum(r.defaultKeyStatistics?.forwardPE);
              if (pe != null && pe > 0) info.pe = pe;
            }
            if (info.eps == null) {
              const eps = parseNum(r.defaultKeyStatistics?.trailingEps);
              if (eps != null) info.eps = eps;
            }
            const trend = r.recommendationTrend?.trend?.find((t: { period: string }) => t.period === "0m");
            if (trend) {
              const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
              if (total > 0) { info.analystRating = computeRating(trend); info.analystCount = total; }
            }
            if (isHoldings && r.topHoldings?.holdings?.length > 0) {
              const top20 = r.topHoldings.holdings.slice(0, 20);
              const rest = r.topHoldings.holdings.slice(20);
              const mapped: Holding[] = top20.map((h: { symbol?: string; holdingName?: string; holdingPercent?: unknown }) => ({
                symbol: h.symbol ?? "",
                name: h.holdingName ?? h.symbol ?? "",
                pct: parseNum(h.holdingPercent) ?? 0,
              }));
              if (rest.length > 0) {
                mapped.push({ symbol: "", name: "Other", pct: rest.reduce((s: number, h: { holdingPercent?: unknown }) => s + (parseNum(h.holdingPercent) ?? 0), 0) });
              }
              info.holdings = mapped;
            }
            break;
          } catch (e) { console.log("quoteSummary fallback error:", String(e)); }
        }
      }

      info.yahooUrl = asset_type === "crypto"
        ? `https://finance.yahoo.com/quote/${sym}-USD/`
        : `https://finance.yahoo.com/quote/${sym}/`;

      await supabase.from("api_cache").upsert(
        { cache_key: infoKey, response: info, updated_at: new Date().toISOString(), expires_at: new Date(now + FUNDAMENTALS_TTL_MS).toISOString() },
        { onConflict: "cache_key" },
      );
    }

    if (newsFresh) {
      newsData = cachedNews!.response as NewsItem[] | null;
    } else if (!newsData) {
      try {
        const yahooSym = asset_type === "crypto" ? `${sym}-USD` : sym;
        const res = await fetch(
          `https://query1.finance.yahoo.com/v1/finance/search?q=${yahooSym}&quotesCount=0&newsCount=10`,
          { headers: YAHOO_HEADERS },
        );
        if (res.ok) {
          const data = await res.json() as { news?: Array<{ title?: string; publisher?: string; link?: string; providerPublishTime?: number }> };
          if (data.news?.length) {
            newsData = data.news.filter((n) => n.title && n.link).map((n) => ({
              title: n.title!, publisher: n.publisher ?? "", link: n.link!, publishedAt: (n.providerPublishTime ?? 0) * 1000,
            }));
          }
        }
      } catch (e) { console.log("news fallback error:", String(e)); }
    }

    if (!newsFresh) {
      await supabase.from("api_cache").upsert(
        { cache_key: newsKey, response: newsData, updated_at: new Date().toISOString(), expires_at: new Date(now + NEWS_TTL_MS).toISOString() },
        { onConflict: "cache_key" },
      );
    }

    return json({
      sector: info.sector ?? null,
      country: info.country ?? null,
      pe: info.pe ?? null,
      eps: info.eps ?? null,
      analystRating: info.analystRating ?? null,
      analystCount: info.analystCount ?? null,
      holdings: info.holdings ?? null,
      news: newsData,
      yahooUrl: info.yahooUrl ?? null,
    });
  } catch (err) {
    console.error("fetch-asset-info error:", err);
    return json({ sector: null, country: null, pe: null, eps: null, analystRating: null, analystCount: null, holdings: null, news: null, yahooUrl: null });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
