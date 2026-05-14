import { YAHOO_HEADERS } from "./constants.ts";
import type { CorporateActions } from "./types.ts";
import { tsToIsoDate } from "./utils.ts";

export async function fetchYahooCorporateActions(
  symbol: string,
  fromTs: number,
  toTs: number,
): Promise<CorporateActions> {
  const empty: CorporateActions = { dividends: [], splits: [] };
  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${fromTs}&period2=${toTs}&events=div%2Csplits`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      await res.body?.cancel();
      return empty;
    }

    const data = await res.json() as {
      chart?: {
        result?: Array<{
          events?: {
            dividends?: Record<string, { amount?: number; date?: number }>;
            splits?: Record<string, {
              numerator?: number;
              denominator?: number;
              date?: number;
            }>;
          };
        }> | null;
      };
    };

    const events = data.chart?.result?.[0]?.events;
    if (!events) return empty;

    const dividends: CorporateActions["dividends"] = [];
    for (const event of Object.values(events.dividends ?? {})) {
      const ts = event?.date;
      const amount = event?.amount;
      if (typeof ts !== "number" || typeof amount !== "number" || !(amount > 0)) continue;
      dividends.push({ date: tsToIsoDate(ts), amount });
    }

    const splits: CorporateActions["splits"] = [];
    for (const event of Object.values(events.splits ?? {})) {
      const ts = event?.date;
      const numerator = event?.numerator;
      const denominator = event?.denominator;
      if (typeof ts !== "number" || typeof numerator !== "number" || typeof denominator !== "number") continue;
      if (!(numerator > 0) || !(denominator > 0)) continue;
      splits.push({ date: tsToIsoDate(ts), numerator, denominator });
    }

    dividends.sort((a, b) => a.date.localeCompare(b.date));
    splits.sort((a, b) => a.date.localeCompare(b.date));
    return { dividends, splits };
  } catch (e) {
    console.error(`Yahoo Finance corporate-actions error for ${symbol}:`, e);
    return empty;
  }
}
