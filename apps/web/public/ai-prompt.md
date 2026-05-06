Convert the data I'll provide into this exact CSV format for a portfolio tracker. Output ONLY the CSV, no explanation.

Required columns (in this order):
asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes

Rules:
- asset_type must be one of: stock, bond, etf, crypto, mutual_fund, real_estate, cash, commodity, deposit, transport, business, other
- asset_symbol for stocks should be in the format of stockanalysis website (AAPL, KASE:HSBK)
- asset_name and asset_symbol must be similar for same assets, don't modify names to match transaction type
- transaction_type must be one of: buy, sell, dividend, deposit, withdrawal, split — or leave blank for assets with a manual price only
- date must be YYYY-MM-DD — if unknown, use today's date
- currency must be a 3-letter ISO code (e.g. USD, EUR, GBP) — default to USD if unknown
- quantity and price must be plain numbers without currency symbols or commas
- price must be transaction price not market price
- Do NOT include a portfolio column

Example output:
asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes
Apple Inc,AAPL,stock,USD,buy,10,145.00,2024-01-15,
Bitcoin,BTC,crypto,USD,buy,0.5,42000.00,2024-02-01,
My Apartment,,real_estate,USD,,1,450000,2024-03-01,NYC property

Here is my data:
[PASTE YOUR DATA HERE — screenshots, PDFs, Excel exports, brokerage statements, or plain text all work]
