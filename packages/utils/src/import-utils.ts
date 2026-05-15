export const VALID_ASSET_TYPES = new Set([
  'stock', 'bond', 'etf', 'crypto', 'mutual_fund',
  'real_estate', 'cash', 'commodity', 'transport', 'business', 'other',
])

export const VALID_TX_TYPES = new Set([
  'buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'split',
])

export interface ImportRow {
  asset_name: string
  symbol: string
  asset_type: string
  currency: string
  transaction_type: string
  quantity: string
  price: string
  date: string
  notes: string
}

export interface ParsedRow extends ImportRow {
  rowNum: number
  errors: string[]
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function parseAndVerify(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const firstLine = lines[0].toLowerCase()
  const hasHeader =
    firstLine.startsWith('asset_name') ||
    (firstLine.includes('asset_type') && firstLine.includes(','))
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map((line, i) => {
    const rowNum = i + (hasHeader ? 2 : 1)
    const parts = parseCSVLine(line)

    const row: ParsedRow = {
      rowNum,
      asset_name: parts[0] ?? '',
      symbol: parts[1] ?? '',
      asset_type: normalizeAssetType(parts[2] ?? ''),
      currency: (parts[3] ?? '').toUpperCase(),
      transaction_type: (parts[4] ?? '').toLowerCase(),
      quantity: parts[5] ?? '',
      price: parts[6] ?? '',
      date: parts[7] ?? '',
      notes: parts[8] ?? '',
      errors: [],
    }

    if (!row.asset_name) row.errors.push('asset_name is required')

    if (!row.asset_type) {
      row.errors.push('asset_type is required')
    } else if (!VALID_ASSET_TYPES.has(row.asset_type)) {
      row.errors.push(`"${row.asset_type}" is not a valid asset_type`)
    }

    if (row.currency && row.currency.length !== 3) {
      row.errors.push(`"${row.currency}" must be a 3-letter currency code`)
    }

    if (row.transaction_type && !VALID_TX_TYPES.has(row.transaction_type)) {
      row.errors.push(`"${row.transaction_type}" is not a valid transaction_type`)
    }

    if (row.transaction_type) {
      if (!row.quantity || isNaN(Number(row.quantity))) {
        row.errors.push('quantity must be a number when transaction_type is set')
      }
      if (!row.price || isNaN(Number(row.price))) {
        row.errors.push('price must be a number when transaction_type is set')
      }
    } else if (row.price && isNaN(Number(row.price))) {
      row.errors.push('price must be a number')
    }

    if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      row.errors.push(`"${row.date}" must be in YYYY-MM-DD format`)
    }

    return row
  })
}

function normalizeAssetType(value: string): string {
  const assetType = value.toLowerCase()
  return assetType === 'deposit' ? 'cash' : assetType
}
