const NEWS_LINK_CHECK_CONCURRENCY = 4;
const NEWS_LINK_CHECK_TIMEOUT_MS = 3500;

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  relatedTickers?: string[];
}

export async function filterReachableNews(news: NewsItem[] | null): Promise<NewsItem[] | null> {
  if (!news?.length) return null;

  const kept: NewsItem[] = [];
  for (let i = 0; i < news.length; i += NEWS_LINK_CHECK_CONCURRENCY) {
    const batch = news.slice(i, i + NEWS_LINK_CHECK_CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => ({
      item,
      reachable: await isReachableNewsLink(item.link),
    })));
    for (const result of results) {
      if (result.reachable) kept.push(result.item);
    }
  }

  return kept.length > 0 ? kept : null;
}

async function isReachableNewsLink(url: string): Promise<boolean> {
  if (!isHttpUrl(url)) return false;
  const headStatus = await fetchLinkStatus(url, "HEAD");
  if (isReachableStatus(headStatus)) return true;
  if (headStatus === 404 || headStatus === 410) return false;

  const getStatus = await fetchLinkStatus(url, "GET");
  return isReachableStatus(getStatus);
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isReachableStatus(status: number | null): boolean {
  return status != null && ((status >= 200 && status < 400) || status === 401 || status === 403 || status === 429);
}

async function fetchLinkStatus(url: string, method: "HEAD" | "GET"): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NEWS_LINK_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html,application/xhtml+xml,application/json" },
      signal: controller.signal,
    });
    const status = res.status;
    await res.body?.cancel();
    return status;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
