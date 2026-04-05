import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYMBOL_TO_CG_ID: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", ADA: "cardano",
  DOT: "polkadot", MATIC: "matic-network", POL: "matic-network",
  AVAX: "avalanche-2", LINK: "chainlink", UNI: "uniswap",
  DOGE: "dogecoin", SHIB: "shiba-inu", LTC: "litecoin", XRP: "ripple",
  ATOM: "cosmos", NEAR: "near", ALGO: "algorand", XLM: "stellar",
  BNB: "binancecoin", USDT: "tether", USDC: "usd-coin", DAI: "dai",
  TRX: "tron", TON: "the-open-network", APT: "aptos", SUI: "sui",
  OP: "optimism", ARB: "arbitrum", FIL: "filecoin", ICP: "internet-computer",
  BCH: "bitcoin-cash", ETC: "ethereum-classic", XMR: "monero", ZEC: "zcash",
};

const PRICEABLE = ["stock", "etf", "bond", "mutual_fund", "commodity", "crypto"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { symbol, asset_type } = await req.json() as {
      symbol: string;
      asset_type: string;
    };

    const sym = symbol.toUpperCase().trim();
    if (!sym || !asset_type) {
      return json({ name: null, price: null });
    }

    if (!PRICEABLE.includes(asset_type)) {
      return json({ name: null, price: null });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check cache (1 hour TTL for name lookups)
    const cacheKey = `lookup:${sym}`;
    const { data: cached } = await supabase
      .from("api_cache")
      .select("response, updated_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cached) {
      const age = (Date.now() - new Date(cached.updated_at).getTime()) / 1000;
      if (age < 3600) {
        return json(cached.response as { name: string | null; price: number | null });
      }
    }

    let name: string | null = null;
    let price: number | null = null;

    if (asset_type === "crypto") {
      const cgId = SYMBOL_TO_CG_ID[sym] ?? sym.toLowerCase();

      // Get name + price in one call
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
          { headers: { Accept: "application/json" } },
        );
        if (res.ok) {
          const data = await res.json() as {
            name: string;
            market_data: { current_price: { usd: number } };
          };
          name = data.name ?? null;
          price = data.market_data?.current_price?.usd ?? null;
        }
      } catch (_) { /* ignore */ }

      // Fallback: search by symbol
      if (!name) {
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${sym}`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json() as {
              coins: { name: string; symbol: string }[];
            };
            const match = data.coins.find(
              (c) => c.symbol.toUpperCase() === sym,
            );
            if (match) name = match.name;
          }
        } catch (_) { /* ignore */ }
      }
    } else {
      // Stock / ETF / bond etc — use Finnhub
      const token = Deno.env.get("FINNHUB_API_KEY");
      if (token) {
        await Promise.all([
          // Name from company profile
          fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${token}`,
          ).then(async (r) => {
            if (r.ok) {
              const d = await r.json() as { name?: string };
              if (d.name) name = d.name;
            }
          }).catch(() => {}),

          // Current price from quote
          fetch(
            `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${token}`,
          ).then(async (r) => {
            if (r.ok) {
              const d = await r.json() as { c?: number };
              if (d.c && d.c > 0) price = d.c;
            }
          }).catch(() => {}),
        ]);
      }
    }

    const result = { name, price };

    // Cache result
    await supabase.from("api_cache").upsert(
      { cache_key: cacheKey, response: result, updated_at: new Date().toISOString() },
      { onConflict: "cache_key" },
    );

    return json(result);
  } catch (err) {
    console.error("lookup-symbol error:", err);
    return json({ name: null, price: null });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
