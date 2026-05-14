import { YAHOO_BROWSER_HEADERS } from "./constants.ts";
import type { YahooNewsItem } from "./types.ts";

export async function fetchYahooNews(yahooSym: string): Promise<YahooNewsItem[] | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSym)}&quotesCount=0&newsCount=10&enableFuzzyQuery=false`,
      { headers: YAHOO_BROWSER_HEADERS },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }

    const data = await res.json() as {
      news?: Array<{
        title?: string;
        publisher?: string;
        link?: string;
        providerPublishTime?: number;
        relatedTickers?: string[];
      }>;
    };
    const news = data.news
      ?.filter((item) => item.title && item.link)
      .map((item) => ({
        title: item.title!,
        publisher: item.publisher ?? "",
        link: item.link!,
        publishedAt: (item.providerPublishTime ?? 0) * 1000,
        relatedTickers: item.relatedTickers,
      }));
    return news?.length ? news : null;
  } catch (e) {
    console.log("yahoo news error:", String(e));
    return null;
  }
}
