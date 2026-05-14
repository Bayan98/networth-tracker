import { YAHOO_HEADERS } from "./constants.ts";
import type { YahooLookupSummary } from "./types.ts";
import { clearbitLogoUrlFromWebsite } from "./utils.ts";

export async function fetchYahooSummary(yahooSym: string): Promise<Partial<YahooLookupSummary>> {
  const result: Partial<YahooLookupSummary> = {};

  try {
    const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${yahooSym}?modules=price%2CassetProfile`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (res.ok) {
      const data = await res.json() as {
        quoteSummary?: {
          result?: Array<{
            price?: { shortName?: string; longName?: string; currency?: string; regularMarketPrice?: { raw?: number } };
            assetProfile?: { longBusinessSummary?: string; website?: string };
          }> | null;
          error?: unknown;
        };
      };
      if (data?.quoteSummary?.error) return result;
      const quote = data?.quoteSummary?.result?.[0];
      if (quote?.price) {
        result.name = quote.price.longName ?? quote.price.shortName ?? null;
        result.currency = quote.price.currency ?? null;
        const rawPrice = quote.price.regularMarketPrice?.raw;
        if (rawPrice != null && rawPrice > 0) result.price = rawPrice;
      }
      if (quote?.assetProfile?.longBusinessSummary) {
        result.description = quote.assetProfile.longBusinessSummary.slice(0, 500);
      }
      if (quote?.assetProfile?.website) {
        result.logoUrl = clearbitLogoUrlFromWebsite(quote.assetProfile.website) ?? undefined;
      }
    } else {
      await res.body?.cancel();
    }
  } catch {
    // ignore provider fallback errors
  }

  if (!result.logoUrl) {
    result.logoUrl = await fetchYahooSearchLogoUrl(yahooSym) ?? undefined;
  }

  return result;
}

export async function findYahooSymbol(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=5&newsCount=0`,
      { headers: YAHOO_HEADERS },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = await res.json() as {
      quotes?: Array<{ symbol?: string; typeDisp?: string; quoteType?: string }>;
    };
    const candidates = (data?.quotes ?? [])
      .filter((quote) => quote.symbol && !["FUTURE", "CURRENCY", "OPTION", "INDEX"].includes(quote.quoteType ?? ""))
      .filter((quote) => quote.symbol!.toUpperCase().startsWith(ticker.toUpperCase()));
    return candidates[0]?.symbol ?? null;
  } catch {
    return null;
  }
}

export async function fetchYahooSearchLogoUrl(yahooSym: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSym)}&quotesCount=1&newsCount=0`,
      { headers: YAHOO_HEADERS },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = await res.json() as { quotes?: Array<{ logoUrl?: string }> };
    return data?.quotes?.[0]?.logoUrl ?? null;
  } catch {
    return null;
  }
}
