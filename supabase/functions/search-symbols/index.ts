import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

async function searchStockAnalysis(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://stockanalysis.com/api/search/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://stockanalysis.com/",
        "Origin": "https://stockanalysis.com",
      },
    });
    if (!res.ok) {
      console.log("StockAnalysis search status:", res.status);
      return [];
    }
    const raw = await res.json();
    // deno-lint-ignore no-explicit-any
    const items: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.results ?? []);
    return items
      .slice(0, 15)
      .map((item) => {
        const rawSym = String(item.s ?? item.symbol ?? "");
        // SA encodes international stocks as "exchange/TICKER"
        const slashIdx = rawSym.indexOf("/");
        const ticker = slashIdx >= 0 ? rawSym.slice(slashIdx + 1).toUpperCase() : rawSym.toUpperCase();
        const exchange = slashIdx >= 0 ? rawSym.slice(0, slashIdx).toUpperCase() : (item.e ?? item.exchange ?? undefined);
        return {
          symbol: ticker,
          name: String(item.n ?? item.name ?? ""),
          exchange: exchange || undefined,
          type: item.t ?? item.type ?? undefined,
        };
      })
      .filter((r) => r.symbol && r.name);
  } catch (e) {
    console.log("StockAnalysis search error:", String(e));
    return [];
  }
}

async function searchYahoo(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchDisp?: string;
        typeDisp?: string;
        quoteType?: string;
      }>;
    };
    return (data?.quotes ?? [])
      .filter((q) => q.symbol && (q.shortname || q.longname))
      .filter((q) => !["FUTURE", "CURRENCY", "OPTION"].includes(q.quoteType ?? ""))
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol!,
        name: q.longname ?? q.shortname ?? q.symbol!,
        exchange: q.exchDisp,
        type: q.typeDisp,
      }));
  } catch (e) {
    console.log("Yahoo search error:", String(e));
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { query, asset_type } = await req.json() as { query: string; asset_type?: string };
    const q = query?.trim();
    if (!q) return json({ results: [] });

    const [saResults, yahooResults] = await Promise.all([
      searchStockAnalysis(q),
      searchYahoo(q),
    ]);

    const isCrypto = asset_type === "crypto";
    const filterType = (r: SearchResult) => {
      const t = (r.type ?? "").toLowerCase();
      if (isCrypto) return t.includes("crypto") || t.includes("currency") || t === "c";
      return !t.includes("crypto") && !t.includes("currency") && t !== "c" && t !== "f";
    };
    saResults.splice(0, saResults.length, ...saResults.filter(filterType));
    yahooResults.splice(0, yahooResults.length, ...yahooResults.filter(filterType));

    // Merge: StockAnalysis primary, Yahoo fills gaps for symbols not in SA results
    const saSymbols = new Set(saResults.map((r) => r.symbol.toUpperCase()));
    const yahooOnly = yahooResults.filter((r) => {
      const base = r.symbol.replace(/\.[A-Z]+$/, "").toUpperCase();
      return !saSymbols.has(r.symbol.toUpperCase()) && !saSymbols.has(base);
    });
    const all = [...saResults, ...yahooOnly];

    // If a symbol appears both with and without an exchange, prefer the one without (primary listing)
    const primaryBySymbol = new Set<string>();
    const deduped: SearchResult[] = [];
    for (const r of all) {
      const key = r.symbol.toUpperCase();
      if (!r.exchange) primaryBySymbol.add(key);
    }
    for (const r of all) {
      const key = r.symbol.toUpperCase();
      if (r.exchange && primaryBySymbol.has(key)) continue;
      deduped.push(r);
    }
    const merged = deduped.slice(0, 10);

    return json({ results: merged });
  } catch (err) {
    console.error("search-symbols error:", err);
    return json({ results: [] });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
