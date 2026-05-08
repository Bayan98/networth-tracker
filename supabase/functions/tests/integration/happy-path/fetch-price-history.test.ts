import {
  handleFetchPriceHistory,
  type Period,
} from "../../../fetch-price-history/index.ts";
import {
  assert,
  assertEquals,
  assertInRange,
} from "../../_shared/assertions.ts";
import { InMemoryCache } from "../../_shared/cache.ts";
import { FIXED_NOW, TEST_ITEMS } from "../../_shared/fixtures.ts";

const ranges: Record<Period, [number, number]> = {
  "1w": [2, 8],
  "1m": [18, 32],
  "1y": [50, 54],
  "5y": [58, 62],
};

for (const period of ["1w", "1m", "1y", "5y"] as Period[]) {
  Deno.test(`fetch-price-history happy path returns ${period} histories`, async () => {
    const cache = new InMemoryCache();
    const result = await handleFetchPriceHistory(
      { items: TEST_ITEMS, period },
      {
        cache,
        now: () => FIXED_NOW,
      },
    );

    for (const item of TEST_ITEMS) {
      const symbol = item.symbol.toUpperCase();
      const points = result.history[symbol];
      assert(points?.length > 0, `${symbol} should have history`);
      assertInRange(
        points.length,
        ranges[period][0],
        ranges[period][1],
        `${symbol} ${period} point count`,
      );
      for (let i = 0; i < points.length; i++) {
        assert(
          points[i].price > 0,
          `${symbol} point ${i} should have positive price`,
        );
        if (i > 0) {
          assert(
            points[i - 1].date <= points[i].date,
            `${symbol} points should be sorted`,
          );
        }
      }
    }

    assertEquals(result.currencies?.["KASE:HSBK"], "KZT");
    assertEquals(result.currencies?.["HKG:1810"], "HKD");
    assert(
      result.currencies?.AAPL != null,
      "AAPL should include a source currency",
    );
    assertEquals(result.currencies?.BTC, undefined);
  });
}
