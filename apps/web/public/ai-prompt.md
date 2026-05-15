Convert the data I provide into this exact CSV format for a portfolio tracker.
Output ONLY the CSV. Do not add explanations, markdown fences, summaries, or extra text.

Required columns, in this exact order:
asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes

Allowed values:
- asset_type: stock, bond, etf, crypto, mutual_fund, real_estate, cash, commodity, transport, business, other
- transaction_type: buy, sell, dividend, deposit, withdrawal, split

General rules:
- Include the header row exactly as shown.
- Use one row per transaction, lot, purchase, sale, dividend, deposit, withdrawal, split, or manual valuation.
- Do not include a portfolio column.
- Use English names and notes.
- Keep the same asset_name and symbol for every row that belongs to the same asset.
- Do not change asset_name based on the transaction type. For example, use "Gold", not "Gold purchase".
- If an asset has a symbol, write it consistently and uppercase it when appropriate.
- If an asset has no usable ticker or symbol, leave symbol blank.
- currency must be a 3-letter ISO code such as USD, EUR, GBP, KZT, or JPY. Use USD if unknown.
- date must be YYYY-MM-DD. If unknown, use today's date.
- quantity and price must be plain numbers only: no currency signs, commas, spaces, units, or percent signs.
- price is the unit transaction price, not the current market price and not the total row value.
- If only total value is provided, calculate price as total value divided by quantity.
- For manual valuations or assets with only an estimated/current value, leave transaction_type blank and put the manual price in price.
- Quote fields with double quotes if they contain commas.

Asset type guidance:
- Use stock for individual company shares.
- Use etf for exchange-traded funds, including broad market ETFs and commodity ETFs if the holding is the fund itself.
- Use bond for bonds and fixed income securities.
- Use mutual_fund for mutual funds.
- Use crypto for coins and tokens. Common symbols include BTC and ETH.
- Use cash for bank accounts, deposits, savings, checking, money market cash, and cash balances. Do not use deposit as asset_type.
- Use real_estate for properties and land.
- Use commodity for physical commodities or directly tracked commodity instruments such as gold, silver, oil, or metals.
- Use transport for vehicles, boats, aircraft, and similar assets.
- Use business for private company, LLC, partnership, or startup equity.
- Use other for collectibles and anything that does not fit above.

Symbol rules:
- For US stocks and ETFs, use symbols like AAPL, MSFT, VTI, GLD.
- For non-US stocks, use the StockAnalysis-style exchange prefix when known, such as KASE:HSBK or HKG:1810.
- For Yahoo-style commodity futures, use symbols like GC=F for gold, SI=F for silver, CL=F for crude oil, HG=F for copper.
- For physical gold, use symbol GC=F when the value should track live gold prices.
- For physical silver, use symbol SI=F when the value should track live silver prices.
- For other physical commodities without a reliable live ticker, leave symbol blank and use manual valuation rows.

Commodity unit rules:
- The tracker prices physical gold with symbol GC=F per gram.
- The tracker prices physical silver with symbol SI=F per gram.
- For gold or silver data already listed in grams, use quantity in grams and price per gram.
- For gold or silver data listed in troy ounces, convert to grams using 1 troy ounce = 31.1034768 grams, and convert price per troy ounce to price per gram.
- For gold or silver data listed as a total value only, use quantity in grams if known and calculate price as total value divided by grams.
- For commodity symbols that are not GC=F or SI=F, keep the source unit implied by the symbol or statement, such as barrels for CL=F.
- Put original units or conversion details in notes when helpful, but keep quantity and price numeric only.

Transaction rules:
- buy: purchases, acquisitions, deposits into an investment asset, opening lots.
- sell: sales, disposals, reductions in holdings.
- dividend: dividends, interest, distributions, rental income, commodity storage income, or business income.
- deposit: money added to a cash account or private asset contribution.
- withdrawal: money removed from a cash account or private asset distribution.
- split: stock splits or quantity adjustments from corporate actions.
- Leave transaction_type blank only for manual price rows. A blank transaction_type row sets the asset's manual price and does not create a transaction.

Examples:
asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes
Apple Inc,AAPL,stock,USD,buy,10,145.00,2024-01-15,
Bitcoin,BTC,crypto,USD,buy,0.5,42000.00,2024-02-01,
Gold,GC=F,commodity,USD,buy,31.1034768,96.45,2024-03-10,1 troy oz converted to grams
Silver,SI=F,commodity,USD,buy,500,0.92,2024-04-05,500 grams
My Apartment,,real_estate,USD,,1,450000,2024-03-01,NYC property manual valuation
Savings Account,,cash,USD,deposit,10000,1,2024-05-01,Initial cash balance

Here is my data:
[PASTE YOUR DATA HERE - screenshots, PDFs, Excel exports, brokerage statements, or plain text all work]
