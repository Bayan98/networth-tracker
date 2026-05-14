export const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "application/json",
};

export const YAHOO_BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

export const YAHOO_EXCHANGE_SUFFIXES: Record<string, string> = {
  HKG: "HK",
  LSE: "L",
};

export const GRAMS_PER_TROY_OUNCE = 31.1034768;
export const PER_GRAM_COMMODITY_SYMBOLS = new Set(["GC=F", "SI=F"]);
export const PER_GRAM_COMMODITY_CACHE_SUFFIX = ":g-v1";
