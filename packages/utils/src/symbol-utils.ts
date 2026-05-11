export function parseSymbol(sym: string): { exchange: string | null; ticker: string } {
  const idx = sym.indexOf(':')
  if (idx > 0) return { exchange: sym.slice(0, idx).toUpperCase(), ticker: sym.slice(idx + 1).toUpperCase() }
  return { exchange: null, ticker: sym.toUpperCase() }
}

export function formatSymbolForDisplay(sym: string): string {
  const { exchange, ticker } = parseSymbol(sym)
  return exchange ? `${exchange}:${ticker}` : ticker
}

export function normalizeAssetSymbol(sym: string, assetType: string): string {
  const formatted = formatSymbolForDisplay(sym.trim())
  if (assetType !== 'crypto') return formatted

  const ticker = getPrimaryTicker(formatted)
  return ticker.replace(/[-/](USD|USDT|USDC|BUSD|EUR|GBP|BTC|ETH)$/, '')
}

export function isExchangePrefixed(sym: string): boolean {
  return sym.includes(':')
}

export function getPrimaryTicker(sym: string): string {
  return parseSymbol(sym).ticker
}
