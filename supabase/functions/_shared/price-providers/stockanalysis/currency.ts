export const MINOR_CURRENCIES: Record<string, { major: string; factor: number }> = {
  GBX: { major: "GBP", factor: 100 },
  ILA: { major: "ILS", factor: 100 },
  ZAC: { major: "ZAR", factor: 100 },
};

export function normalizePriceCurrency(
  price: number,
  currency: string,
): { price: number; currency: string } {
  const minor = MINOR_CURRENCIES[currency.toUpperCase()];
  return minor ? { price: price / minor.factor, currency: minor.major } : { price, currency };
}
