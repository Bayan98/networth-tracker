export function parseYahooNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  if (typeof value === "object" && typeof (value as { raw?: unknown }).raw === "number") {
    const raw = (value as { raw: number }).raw;
    return isFinite(raw) ? raw : null;
  }
  return null;
}

export function tsToIsoDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function clearbitLogoUrlFromWebsite(website: string): string | null {
  try {
    const domain = new URL(website).hostname.replace(/^www\./, "");
    return `https://logo.clearbit.com/${domain}`;
  } catch {
    return null;
  }
}
