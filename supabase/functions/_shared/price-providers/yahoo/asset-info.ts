import { getYahooCrumb } from "./auth.ts";
import { YAHOO_BROWSER_HEADERS } from "./constants.ts";
import type { YahooAssetInfo, YahooHolding } from "./types.ts";
import { parseYahooNumber } from "./utils.ts";

function emptyAssetInfo(): YahooAssetInfo {
  return {
    sector: null,
    industry: null,
    country: null,
    pe: null,
    eps: null,
    analystRating: null,
    analystCount: null,
    holdings: null,
    description: null,
    website: null,
    employees: null,
    marketCap: null,
    exchange: null,
    priceTarget: null,
  };
}

function computeRating(trend: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }): string {
  const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
  if (total === 0) return "Hold";
  const score = (trend.strongBuy * 2 + trend.buy - trend.sell - trend.strongSell * 2) / total;
  if (score > 1.5) return "Strong Buy";
  if (score > 0.5) return "Buy";
  if (score > -0.5) return "Hold";
  if (score > -1.5) return "Sell";
  return "Strong Sell";
}

export async function fetchYahooAssetInfo(yahooSym: string, assetType: string): Promise<Partial<YahooAssetInfo>> {
  const info: Partial<YahooAssetInfo> = {};
  const isHoldings = assetType === "etf" || assetType === "mutual_fund";

  await enrichFromSearch(yahooSym, info);
  await enrichFromQuote(yahooSym, info);
  await enrichFromQuoteSummary(yahooSym, assetType, isHoldings, info);

  return { ...emptyAssetInfo(), ...info };
}

async function enrichFromSearch(yahooSym: string, info: Partial<YahooAssetInfo>) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSym)}&quotesCount=1&newsCount=0&enableFuzzyQuery=false`,
      { headers: YAHOO_BROWSER_HEADERS },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return;
    }

    const data = await res.json() as {
      quotes?: Array<{ symbol?: string; sector?: string; industry?: string; region?: string; exchange?: string; exchDisp?: string }>;
    };
    const quote = data.quotes?.find((item) => item.symbol?.toUpperCase() === yahooSym.toUpperCase()) ?? data.quotes?.[0];
    if (!quote) return;
    info.sector = quote.sector ?? null;
    info.industry = quote.industry ?? null;
    info.country = quote.region ?? null;
    info.exchange = quote.exchDisp ?? quote.exchange ?? null;
  } catch (e) {
    console.log("yahoo search error:", String(e));
  }
}

async function enrichFromQuote(yahooSym: string, info: Partial<YahooAssetInfo>) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSym)}&fields=trailingPE,epsTrailingTwelveMonths,sector,country,marketCap,fullExchangeName,exchange,targetMeanPrice`,
      { headers: YAHOO_BROWSER_HEADERS },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return;
    }

    const data = await res.json() as { quoteResponse?: { result?: Record<string, unknown>[] } };
    const quote = data?.quoteResponse?.result?.[0];
    if (!quote) return;

    const pe = parseYahooNumber(quote.trailingPE);
    const eps = parseYahooNumber(quote.epsTrailingTwelveMonths);
    if (pe != null && pe > 0) info.pe = pe;
    if (eps != null) info.eps = eps;
    info.sector ??= typeof quote.sector === "string" ? quote.sector : null;
    info.country ??= typeof quote.country === "string" ? quote.country : null;
    info.marketCap ??= parseYahooNumber(quote.marketCap);
    info.exchange ??= typeof quote.fullExchangeName === "string"
      ? quote.fullExchangeName
      : typeof quote.exchange === "string"
      ? quote.exchange
      : null;
    info.priceTarget ??= parseYahooNumber(quote.targetMeanPrice);
  } catch (e) {
    console.log("yahoo v7 error:", String(e));
  }
}

async function enrichFromQuoteSummary(
  yahooSym: string,
  assetType: string,
  isHoldings: boolean,
  info: Partial<YahooAssetInfo>,
) {
  const modules = isHoldings
    ? "summaryProfile,defaultKeyStatistics,recommendationTrend,topHoldings,financialData,price"
    : "summaryProfile,defaultKeyStatistics,recommendationTrend,financialData,price";
  const auth = await getYahooCrumb();
  const summaryUrls = auth
    ? [
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(auth.crumb)}&formatted=false`,
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(auth.crumb)}&formatted=false`,
    ]
    : [
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?formatted=false&modules=${encodeURIComponent(modules)}&corsDomain=finance.yahoo.com`,
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?formatted=false&modules=${encodeURIComponent(modules)}&corsDomain=finance.yahoo.com`,
    ];
  const headers = auth ? { ...YAHOO_BROWSER_HEADERS, "Cookie": auth.cookie } : YAHOO_BROWSER_HEADERS;

  for (const url of summaryUrls) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        await res.body?.cancel();
        continue;
      }
      const data = await res.json() as { quoteSummary?: { result?: Record<string, unknown>[] | null } };
      const result = data?.quoteSummary?.result?.[0];
      if (!result) continue;

      applySummaryProfile(info, result.summaryProfile);
      applySummaryStats(info, result);
      applyRecommendationTrend(info, result.recommendationTrend);
      if (isHoldings) applyHoldings(info, result.topHoldings, assetType);
      break;
    } catch (e) {
      console.log("yahoo quoteSummary error:", String(e));
    }
  }
}

function applySummaryProfile(info: Partial<YahooAssetInfo>, rawProfile: unknown) {
  const profile = rawProfile && typeof rawProfile === "object" ? rawProfile as Record<string, unknown> : null;
  if (!profile) return;

  info.sector ??= typeof profile.sector === "string" ? profile.sector : null;
  info.industry ??= typeof profile.industry === "string" ? profile.industry : null;
  info.country ??= typeof profile.country === "string" ? profile.country : null;
  info.website ??= typeof profile.website === "string" ? profile.website : null;
  info.employees ??= parseYahooNumber(profile.fullTimeEmployees);
  if (!info.description && typeof profile.longBusinessSummary === "string") {
    info.description = profile.longBusinessSummary.slice(0, 500);
  }
}

function applySummaryStats(info: Partial<YahooAssetInfo>, result: Record<string, unknown>) {
  const defaultKeyStatistics = result.defaultKeyStatistics && typeof result.defaultKeyStatistics === "object"
    ? result.defaultKeyStatistics as Record<string, unknown>
    : {};
  const summaryDetail = result.summaryDetail && typeof result.summaryDetail === "object"
    ? result.summaryDetail as Record<string, unknown>
    : {};
  const financialData = result.financialData && typeof result.financialData === "object"
    ? result.financialData as Record<string, unknown>
    : {};
  const price = result.price && typeof result.price === "object" ? result.price as Record<string, unknown> : {};

  const pe = parseYahooNumber(defaultKeyStatistics.forwardPE ?? summaryDetail.trailingPE);
  const eps = parseYahooNumber(defaultKeyStatistics.trailingEps);
  if (info.pe == null && pe != null && pe > 0) info.pe = pe;
  if (info.eps == null && eps != null) info.eps = eps;
  info.marketCap ??= parseYahooNumber(price.marketCap);
  info.exchange ??= typeof price.exchangeName === "string"
    ? price.exchangeName
    : typeof price.exchange === "string"
    ? price.exchange
    : null;
  info.priceTarget ??= parseYahooNumber(financialData.targetMeanPrice);
}

function applyRecommendationTrend(info: Partial<YahooAssetInfo>, rawTrend: unknown) {
  const trendObj = rawTrend && typeof rawTrend === "object" ? rawTrend as Record<string, unknown> : null;
  const trends = Array.isArray(trendObj?.trend) ? trendObj.trend : [];
  const trend = trends.find((item): item is { period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } => {
    if (!item || typeof item !== "object") return false;
    const value = item as Record<string, unknown>;
    return value.period === "0m" &&
      typeof value.strongBuy === "number" &&
      typeof value.buy === "number" &&
      typeof value.hold === "number" &&
      typeof value.sell === "number" &&
      typeof value.strongSell === "number";
  });
  if (!trend) return;

  const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
  if (total > 0) {
    info.analystRating ??= computeRating(trend);
    info.analystCount ??= total;
  }
}

function applyHoldings(info: Partial<YahooAssetInfo>, rawHoldings: unknown, _assetType: string) {
  const holdingsObj = rawHoldings && typeof rawHoldings === "object" ? rawHoldings as Record<string, unknown> : null;
  const holdings = Array.isArray(holdingsObj?.holdings) ? holdingsObj.holdings : [];
  if (holdings.length === 0) return;

  const top20 = holdings.slice(0, 20);
  const rest = holdings.slice(20);
  const mapped: YahooHolding[] = top20.map((holding) => {
    const h = holding && typeof holding === "object" ? holding as Record<string, unknown> : {};
    const symbol = typeof h.symbol === "string" ? h.symbol : "";
    return {
      symbol,
      name: typeof h.holdingName === "string" ? h.holdingName : symbol,
      pct: parseYahooNumber(h.holdingPercent) ?? 0,
    };
  });
  if (rest.length > 0) {
    mapped.push({
      symbol: "",
      name: "Other",
      pct: rest.reduce((sum: number, holding) => {
        const h = holding && typeof holding === "object" ? holding as Record<string, unknown> : {};
        return sum + (parseYahooNumber(h.holdingPercent) ?? 0);
      }, 0),
    });
  }
  info.holdings = mapped;
}
