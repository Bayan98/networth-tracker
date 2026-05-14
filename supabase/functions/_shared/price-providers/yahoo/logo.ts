import { YAHOO_HEADERS } from "./constants.ts";
import { fetchYahooSearchLogoUrl } from "./lookup.ts";
import { clearbitLogoUrlFromWebsite } from "./utils.ts";

export async function fetchYahooLogoUrl(symbol: string): Promise<string | null> {
  const profileLogo = await fetchYahooProfileLogoUrl(symbol);
  return profileLogo ?? await fetchYahooSearchLogoUrl(symbol);
}

async function fetchYahooProfileLogoUrl(symbol: string): Promise<string | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}?modules=assetProfile`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = await res.json() as {
      quoteSummary?: { result?: Array<{ assetProfile?: { website?: string } }> | null };
    };
    const website = data.quoteSummary?.result?.[0]?.assetProfile?.website;
    return website ? clearbitLogoUrlFromWebsite(website) : null;
  } catch {
    return null;
  }
}
