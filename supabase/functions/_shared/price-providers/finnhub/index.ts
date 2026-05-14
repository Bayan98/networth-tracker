export async function fetchFinnhubQuotes(symbols: string[], token: string | undefined): Promise<Record<string, number>> {
  if (symbols.length === 0 || !token) return {};
  const prices: Record<string, number> = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${token}`);
      if (!res.ok) {
        await res.body?.cancel();
        return;
      }
      const data = await res.json() as { c?: number };
      if (data.c && data.c > 0) prices[sym] = data.c;
    } catch (e) {
      console.error(`Finnhub fallback for ${sym}:`, e);
    }
  }));
  return prices;
}

export async function fetchFinnhubProfileName(symbol: string, token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${token}`);
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = await res.json() as { name?: string };
    return data.name ?? null;
  } catch {
    return null;
  }
}
