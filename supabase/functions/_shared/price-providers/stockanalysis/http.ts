export const SA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://stockanalysis.com/",
};

export type DataArray = unknown[];

export function resolveDataRef(data: DataArray, value: unknown): unknown {
  if (typeof value === "number" && value >= 0 && value < data.length) return data[value];
  return value;
}
