import { YAHOO_HEADERS } from "./constants.ts";
import type { YahooSearchResult } from "./types.ts";

export async function searchYahoo(query: string): Promise<YahooSearchResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
      return [];
    }
    const data = await res.json() as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchDisp?: string;
        typeDisp?: string;
        quoteType?: string;
      }>;
    };
    return (data?.quotes ?? [])
      .filter((quote) => quote.symbol && (quote.shortname || quote.longname))
      .filter((quote) => !["FUTURE", "CURRENCY", "OPTION"].includes(quote.quoteType ?? ""))
      .slice(0, 10)
      .map((quote) => ({
        symbol: quote.symbol!,
        name: quote.longname ?? quote.shortname ?? quote.symbol!,
        exchange: quote.exchDisp,
        type: quote.typeDisp,
      }));
  } catch (e) {
    console.log("Yahoo search error:", String(e));
    return [];
  }
}
