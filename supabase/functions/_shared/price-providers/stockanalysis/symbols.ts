const US_EXCHANGES = new Set(["AMEX", "NASDAQ", "NYSE", "NYSEARCA", "NYSEAMERICAN"]);

export function parseSymbol(sym: string): { exchange: string | null; ticker: string } {
  const idx = sym.indexOf(":");
  if (idx > 0) {
    return { exchange: sym.slice(0, idx).toUpperCase(), ticker: sym.slice(idx + 1).toUpperCase() };
  }
  return { exchange: null, ticker: sym.toUpperCase() };
}

export function stockAnalysisBaseUrl(sym: string, assetType?: string): string {
  const { exchange, ticker } = parseSymbol(sym);
  if (exchange) return `https://stockanalysis.com/quote/${exchange.toLowerCase()}/${ticker.toLowerCase()}`;
  if (assetType === "etf") return `https://stockanalysis.com/etf/${ticker.toLowerCase()}`;
  if (assetType === "crypto") return `https://stockanalysis.com/crypto/${ticker.toLowerCase()}`;
  return `https://stockanalysis.com/stocks/${ticker.toLowerCase()}`;
}

export function stockAnalysisFallbackBaseUrl(sym: string, assetType?: string): string | null {
  const { exchange, ticker } = parseSymbol(sym);
  if (!exchange || !US_EXCHANGES.has(exchange)) return null;
  if (assetType === "etf") return `https://stockanalysis.com/etf/${ticker.toLowerCase()}`;
  return `https://stockanalysis.com/stocks/${ticker.toLowerCase()}`;
}

export function stockAnalysisBaseUrls(sym: string, assetType?: string): string[] {
  const urls = [stockAnalysisBaseUrl(sym, assetType)];
  const fallback = stockAnalysisFallbackBaseUrl(sym, assetType);
  if (fallback) urls.push(fallback);
  return urls;
}

export function stockAnalysisApiSymbol(sym: string): string {
  const { exchange, ticker } = parseSymbol(sym);
  return exchange ? `${exchange}-${ticker}` : ticker;
}

export function stockAnalysisUrl(url: string): string {
  try {
    return new URL(url, "https://stockanalysis.com").toString();
  } catch {
    return url;
  }
}
