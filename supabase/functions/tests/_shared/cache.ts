// deno-lint-ignore no-explicit-any
export class InMemoryCache<Response = any> {
  rows = new Map<string, { cache_key: string; response: Response; updated_at?: string; expires_at: string | null }>();
  getManyCalls = 0;
  upsertCalls = 0;

  constructor(rows: Array<{ cache_key: string; response: Response; updated_at?: string; expires_at: string | null }> = []) {
    for (const row of rows) this.rows.set(row.cache_key, row);
  }

  async getMany(cacheKeys: string[]) {
    this.getManyCalls++;
    return cacheKeys.flatMap((key) => {
      const row = this.rows.get(key);
      return row ? [row] : [];
    });
  }

  async upsert(row: { cache_key: string; response: Response; updated_at: string; expires_at: string }) {
    this.upsertCalls++;
    this.rows.set(row.cache_key, row);
  }
}
