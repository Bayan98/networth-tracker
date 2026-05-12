import {
  fetchYahooNews,
  filterReachableNews,
  filterYahooNewsForAsset,
  handleFetchAssetNews,
  type NewsItem,
} from "../../../fetch-asset-news/index.ts";
import { assert, assertEquals } from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW } from "../../_shared/fixtures.ts";

Deno.test("fetch-asset-news returns absolute StockAnalysis news links", async () => {
  const result = await handleFetchAssetNews(
    { symbol: "KASE:HSBK", asset_type: "stock" },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
    },
  );

  if (!result.news?.length) {
    console.warn("StockAnalysis returned no reachable KASE:HSBK news to verify");
    return;
  }

  for (const item of result.news) {
    assert(
      item.link.startsWith("https://"),
      `news link should be absolute: ${item.link}`,
    );
  }
});

Deno.test("fetch-asset-news filters unreachable provider news links", async () => {
  const news: NewsItem[] = [
    {
      title: "Dead StockAnalysis shortlink",
      publisher: "StockAnalysis",
      link: "https://stockanalysis.com/QdyrRZcZ9sI/",
      publishedAt: FIXED_NOW,
    },
    {
      title: "Reachable StockAnalysis page",
      publisher: "StockAnalysis",
      link: "https://stockanalysis.com/stocks/aapl/",
      publishedAt: FIXED_NOW,
    },
  ];

  const filtered = await filterReachableNews(news);

  assertEquals(filtered?.length, 1);
  assertEquals(filtered?.[0]?.link, "https://stockanalysis.com/stocks/aapl/");
});

Deno.test("fetch-asset-news keeps protected publisher links while removing dead links", async () => {
  const news: NewsItem[] = [
    {
      title: "Protected Reuters page",
      publisher: "Reuters",
      link: "https://www.reuters.com/world/asia-pacific/xiaomi-has-delivered-26000-units-upgraded-su7-series-sedan-2026-04-24/",
      publishedAt: FIXED_NOW,
    },
    {
      title: "Dead StockAnalysis shortlink",
      publisher: "StockAnalysis",
      link: "https://stockanalysis.com/QdyrRZcZ9sI/",
      publishedAt: FIXED_NOW,
    },
  ];

  const filtered = await filterReachableNews(news);

  assertEquals(filtered?.length, 1);
  assertEquals(filtered?.[0]?.publisher, "Reuters");
});

Deno.test("fetch-asset-news prefers live StockAnalysis news for HKG:1810", async () => {
  const result = await handleFetchAssetNews(
    { symbol: "HKG:1810", asset_type: "stock", name: "Xiaomi Corporation" },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
    },
  );

  if (!result.news?.length) {
    console.warn("StockAnalysis returned no reachable HKG:1810 news to verify");
    return;
  }

  assert(
    result.news.some((item) => item.title.toLowerCase().includes("xiaomi")),
    "StockAnalysis HKG:1810 news should include Xiaomi-specific items",
  );
});

Deno.test("fetch-asset-news filters noisy Yahoo fallback by ticker metadata and asset name", () => {
  const news: NewsItem[] = [
    {
      title: "Xiaomi quarterly profit falls amid rising memory costs",
      publisher: "WSJ",
      link: "https://example.com/xiaomi",
      publishedAt: FIXED_NOW,
    },
    {
      title: "Semiconductor ETF jumps after broad market rally",
      publisher: "Example",
      link: "https://example.com/noisy-market-news",
      publishedAt: FIXED_NOW,
    },
    {
      title: "EV maker reports January sales",
      publisher: "Example",
      link: "https://example.com/ticker-match",
      publishedAt: FIXED_NOW,
      relatedTickers: ["HK:1810"],
    },
  ];

  const filtered = filterYahooNewsForAsset(news, "HKG:1810", "1810.HK", "Xiaomi Corporation");

  assertEquals(filtered?.length, 2);
  assertEquals(filtered?.[0]?.link, "https://example.com/xiaomi");
  assertEquals(filtered?.[1]?.link, "https://example.com/ticker-match");
});

Deno.test("fetch-asset-news uses converted Yahoo symbol when StockAnalysis fails", async () => {
  const yahooSymbols: string[] = [];
  const liveYahooNewsRef: { value: NewsItem[] | null } = { value: null };
  const result = await handleFetchAssetNews(
    { symbol: "AAPL", asset_type: "stock" },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
      providers: {
        fetchStockAnalysisNews: async () => {
          throw new Error("forced StockAnalysis failure");
        },
        fetchYahooNews: async (symbol) => {
          yahooSymbols.push(symbol);
          liveYahooNewsRef.value = await fetchYahooNews(symbol);
          return liveYahooNewsRef.value;
        },
      },
    },
  );

  assertEquals(yahooSymbols.length, 1);
  assertEquals(yahooSymbols[0], "AAPL");
  const liveYahooNews = liveYahooNewsRef.value;
  if (!liveYahooNews) throw new Error("Yahoo should return live fallback news for AAPL");
  if (result.news?.length) {
    const liveLinks = new Set(liveYahooNews.map((item) => item.link));
    for (const item of result.news) assert(liveLinks.has(item.link), "returned news should come from live Yahoo data");
  } else {
    console.warn("Yahoo returned news, but no AAPL links were reachable after filtering");
  }
});

Deno.test("fetch-asset-news converts exchange-prefixed symbols for Yahoo fallback", async () => {
  const yahooSymbols: string[] = [];
  await handleFetchAssetNews(
    { symbol: "HKG:1810", asset_type: "stock" },
    {
      cache: new InMemoryCache(),
      now: () => FIXED_NOW,
      providers: {
        fetchStockAnalysisNews: async () => {
          throw new Error("forced StockAnalysis failure");
        },
        fetchYahooNews: async (symbol) => {
          yahooSymbols.push(symbol);
          return await fetchYahooNews(symbol);
        },
      },
    },
  );

  assertEquals(yahooSymbols.length, 1);
  assertEquals(yahooSymbols[0], "1810.HK");
});
