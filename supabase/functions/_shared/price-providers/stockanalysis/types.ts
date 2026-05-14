export interface SAResult {
  price: number | null;
  name: string | null;
  currency: string | null;
  rawCurrency: string | null;
  description: string | null;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface StockAnalysisNewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
}

export interface SAInfo {
  pe: number | null;
  eps: number | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  description: string | null;
  analystRating: string | null;
  analystCount: number | null;
  dividend: string | null;
  beta: number | null;
  news: StockAnalysisNewsItem[] | null;
}

export interface StockAnalysisSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}
