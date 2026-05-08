export async function fetchFinnhubQuotes(symbols: string[], token: string | undefined): Promise<Record<string, number>> {
  if (symbols.length === 0 || !token) return {};
  const prices: Record<string, number> = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${token}`);
      if (!res.ok) return;
      const data = await res.json() as { c?: number };
      if (data.c && data.c > 0) prices[sym] = data.c;
    } catch (e) {
      console.error(`Finnhub fallback for ${sym}:`, e);
    }
  }));
  return prices;
}
