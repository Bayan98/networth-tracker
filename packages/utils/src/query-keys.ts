export const portfolioKeys = {
  all: ['portfolio'] as const,
  lists: () => [...portfolioKeys.all, 'list'] as const,
  detail: (id: string) => [...portfolioKeys.all, 'detail', id] as const,
}

export const holdingKeys = {
  all: ['holdings'] as const,
  byPortfolio: (pid: string) => [...holdingKeys.all, pid] as const,
}

export const transactionKeys = {
  all: ['transactions'] as const,
  byPortfolio: (pid: string) => [...transactionKeys.all, pid] as const,
}

export const priceKeys = {
  all: ['prices'] as const,
  crypto: (ids: string[]) => [...priceKeys.all, 'crypto', ids.sort().join(',')] as const,
  stock: (syms: string[]) => [...priceKeys.all, 'stock', syms.sort().join(',')] as const,
  exchangeRate: (from: string, to: string) => [...priceKeys.all, 'fx', from, to] as const,
}

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
}

export const incomeKeys = {
  all: ['income'] as const,
  list: () => [...incomeKeys.all, 'list'] as const,
}

export const debtKeys = {
  all: ['debts'] as const,
  list: () => [...debtKeys.all, 'list'] as const,
}

export const emergencyFundKeys = {
  all: ['emergency-fund'] as const,
  me: () => [...emergencyFundKeys.all, 'me'] as const,
}
