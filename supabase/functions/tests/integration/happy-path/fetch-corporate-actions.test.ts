import {
  handleFetchCorporateActions,
} from "../../../fetch-corporate-actions/index.ts";
import {
  fetchYahooCorporateActions,
} from "../../../_shared/price-providers/yahoo/index.ts";
import {
  assert,
  assertEquals,
} from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

Deno.test("fetch-corporate-actions returns AAPL dividends and the 2020 4-for-1 split", async () => {
  const cache = new InMemoryCache();
  const result = await handleFetchCorporateActions(
    { symbol: "AAPL", asset_type: "stock", from_date: "2019-01-01" },
    { cache, fetchCorporateActions: fetchYahooCorporateActions },
  );

  assert(result.splits.length >= 1, "expected at least one split for AAPL");
  const aug2020 = result.splits.find((s) => s.date === "2020-08-31");
  assert(aug2020 != null, "expected a 2020-08-31 split entry");
  assertEquals(aug2020!.numerator, 4, "split numerator");
  assertEquals(aug2020!.denominator, 1, "split denominator");

  for (const s of result.splits) {
    assert(ISO_DATE.test(s.date), `split date ${s.date} should be YYYY-MM-DD`);
    assert(s.numerator > 0, `split numerator should be > 0`);
    assert(s.denominator > 0, `split denominator should be > 0`);
  }

  assert(
    result.dividends.length >= 15,
    `expected at least 15 dividends since 2019, got ${result.dividends.length}`,
  );
  for (const d of result.dividends) {
    assert(ISO_DATE.test(d.date), `dividend date ${d.date} should be YYYY-MM-DD`);
    assert(d.amount > 0, `dividend amount should be > 0`);
    assert(d.date >= "2019-01-01", `dividend date ${d.date} should be >= from_date`);
  }
});

Deno.test("fetch-corporate-actions caches the response and skips Yahoo on the second call", async () => {
  const cache = new InMemoryCache();
  let yahooCalls = 0;
  const counted = (sym: string, from: number, to: number) => {
    yahooCalls++;
    return fetchYahooCorporateActions(sym, from, to);
  };

  await handleFetchCorporateActions(
    { symbol: "AAPL", asset_type: "stock", from_date: "2019-01-01" },
    { cache, fetchCorporateActions: counted },
  );
  assertEquals(yahooCalls, 1, "first call should hit Yahoo once");

  const row = cache.rows.get("corporate-actions:v1:AAPL");
  assert(row != null, "cache row should exist after first call");
  assert(row!.expires_at != null, "cache row should carry an expiry");
  const ttlMs = new Date(row!.expires_at!).getTime() - new Date(row!.updated_at!).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  assert(
    Math.abs(ttlMs - oneDayMs) < 60 * 1000,
    `expected TTL ≈ 24h, got ${ttlMs} ms`,
  );

  await handleFetchCorporateActions(
    { symbol: "AAPL", asset_type: "stock", from_date: "2019-01-01" },
    { cache, fetchCorporateActions: counted },
  );
  assertEquals(yahooCalls, 1, "second call should be a cache hit");
});

Deno.test("fetch-corporate-actions returns empty for unsupported asset types", async () => {
  const cache = new InMemoryCache();
  const result = await handleFetchCorporateActions(
    { symbol: "BTC", asset_type: "crypto", from_date: "2019-01-01" },
    { cache, fetchCorporateActions: fetchYahooCorporateActions },
  );
  assertEquals(result.dividends.length, 0);
  assertEquals(result.splits.length, 0);
  assertEquals(cache.upsertCalls, 0, "should not write to cache for unsupported types");
});
