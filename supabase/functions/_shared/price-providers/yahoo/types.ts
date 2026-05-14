export interface PricePoint {
  date: string;
  price: number;
}

export interface CorporateActions {
  dividends: Array<{ date: string; amount: number }>;
  splits: Array<{ date: string; numerator: number; denominator: number }>;
}

export interface YahooHolding {
  symbol: string;
  name: string;
  pct: number;
}

export interface YahooAssetInfo {
  sector: string | null;
  industry: string | null;
  country: string | null;
  pe: number | null;
  eps: number | null;
  analystRating: string | null;
  analystCount: number | null;
  holdings: YahooHolding[] | null;
  description: string | null;
  website: string | null;
  employees: number | null;
  marketCap: number | null;
  exchange: string | null;
  priceTarget: number | null;
}

export interface YahooNewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  relatedTickers?: string[];
}

export interface YahooLookupSummary {
  name: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
  logoUrl: string | null;
}

export interface YahooSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}
