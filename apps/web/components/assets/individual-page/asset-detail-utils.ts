export const ASSET_TYPE_COLOR: Record<string, string> = {
  stock: 'var(--cat-stocks)',
  etf: 'var(--cat-stocks)',
  bond: 'var(--cat-stocks)',
  mutual_fund: 'var(--cat-stocks)',
  crypto: 'var(--cat-crypto)',
  cash: 'var(--cat-cash)',
  real_estate: 'var(--cat-real)',
  commodity: 'var(--cat-other)',
  business: 'var(--cat-other)',
  transport: 'var(--cat-other)',
  other: 'var(--cat-other)',
}

export const TX_BG: Record<string, string> = {
  buy: 'color-mix(in oklch, var(--pos) 12%, transparent)',
  sell: 'color-mix(in oklch, var(--neg) 12%, transparent)',
  dividend: 'var(--surface-2)',
  deposit: 'color-mix(in oklch, var(--pos) 12%, transparent)',
  withdrawal: 'color-mix(in oklch, var(--neg) 12%, transparent)',
  split: 'var(--surface-2)',
}

export const TX_INK: Record<string, string> = {
  buy: 'var(--pos)',
  sell: 'var(--neg)',
  dividend: 'var(--ink-2)',
  deposit: 'var(--pos)',
  withdrawal: 'var(--neg)',
  split: 'var(--ink-muted)',
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
