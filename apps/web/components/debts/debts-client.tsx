'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, CreditCard, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import type { Debt, CurrencyCode } from '@networth/types'
import { LoadingText, MoneyText } from '@/components/ui/money-text'
import { AddDebtDialog } from './add-debt-dialog'
import { EditDebtDialog } from './edit-debt-dialog'

interface Props {
  debts: Debt[]
  userId: string
  currency: CurrencyCode
}

function MiniStat({ label, value, sub, trend }: {
  label: string; value: ReactNode; sub: ReactNode; trend?: 'pos' | 'neg'
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val" style={{ fontSize: 22, marginBottom: 4 }}>{value}</div>
      <div className="kpi-sub" style={{ color: trend === 'pos' ? 'var(--pos)' : trend === 'neg' ? 'var(--neg)' : 'var(--ink-faint)' }}>
        {sub}
      </div>
    </div>
  )
}

function DebtIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes('mortgage') || lower.includes('home') || lower.includes('house')) {
    return <Home size={14} />
  }
  return <CreditCard size={14} />
}

export function DebtsClient({ debts, userId, currency }: Props) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)

  const _selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const selectedCurrency = isMounted ? _selectedCurrency : currency
  const { fx, loading: fxLoading } = useTodayFx(
    debts.map((debt) => ({ currency: debt.currency })),
    selectedCurrency,
  )

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const activeDebts = debts.filter((d) => d.is_active)
  const debtTotals = useMemo(() => {
    let totalDebt = 0
    let totalMinPayment = 0
    let weightedInterest = 0
    let hasMissingFx = false

    for (const debt of activeDebts) {
      const rate = fx(debt.currency)
      if (rate === null) {
        hasMissingFx = true
        continue
      }

      const convertedBalance = Number(debt.current_balance) * rate
      totalDebt += convertedBalance
      totalMinPayment += Number(debt.minimum_payment) * rate
      weightedInterest += Number(debt.interest_rate) * convertedBalance
    }

    return {
      totalDebt: hasMissingFx ? null : totalDebt,
      totalMinPayment: hasMissingFx ? null : totalMinPayment,
      weightedAPR: hasMissingFx ? null : totalDebt > 0 ? weightedInterest / totalDebt : 0,
    }
  }, [activeDebts, fx])

  function fmtAPR(rate: number) {
    return `${(rate * 100).toFixed(2)}%`
  }

  const statsLoading = !isMounted || fxLoading

  return (
    <>
      <div className="page-head">
        <div>
          <div className="empty-label">Liabilities</div>
          <h1>Debts <em>&amp; liabilities.</em></h1>
          <p>Track balances, rates, and payoff progress across every loan.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add debt
        </button>
      </div>

      {/* Stats row */}
      <div className="stat-grid">
        <MiniStat
          label="Total owed"
          value={<MoneyText value={debtTotals.totalDebt} currency={selectedCurrency} loading={statsLoading} maskLength={6} skelWidth={110} skelHeight={22} />}
          sub={`${activeDebts.length} active loan${activeDebts.length !== 1 ? 's' : ''}`}
          trend="neg"
        />
        <MiniStat
          label="Monthly payment"
          value={<MoneyText value={debtTotals.totalMinPayment} currency={selectedCurrency} loading={statsLoading} maskLength={6} skelWidth={100} skelHeight={22} />}
          sub={`${activeDebts.length} active loan${activeDebts.length !== 1 ? 's' : ''}`}
        />
        <MiniStat
          label="Weighted APR"
          value={<LoadingText loading={statsLoading} skelWidth={72} skelHeight={22}>{debtTotals.weightedAPR === null ? '—' : fmtAPR(debtTotals.weightedAPR)}</LoadingText>}
          sub="Fixed + variable"
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-head"><h3>All debts</h3></div>
        {debts.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p className="empty-label">No debts recorded.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Debt</th>
                <th className="num">APR</th>
                <th className="num">Payment</th>
                <th className="num">Balance</th>
                <th className="num">Payoff</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {debts.map((d) => {
                const principal = Number(d.principal_amount)
                const balance = Number(d.current_balance)
                const progress = principal > 0 ? Math.max(0, Math.min(100, ((principal - balance) / principal) * 100)) : 0
                const monthlyPayment = Number(d.minimum_payment)
                const payoffYears = monthlyPayment > 0 ? (balance / (monthlyPayment * 12)).toFixed(1) : '—'

                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          display: 'grid', placeItems: 'center',
                          color: 'var(--neg)', flexShrink: 0,
                        }}>
                          <DebtIcon name={d.name} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                            {progress.toFixed(0)}% paid off
                          </div>
                          <div style={{
                            height: 3,
                            background: 'var(--border)',
                            borderRadius: 2,
                            marginTop: 5,
                            width: 160,
                            maxWidth: '100%',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${progress}%`,
                              background: 'var(--pos)',
                              borderRadius: 2,
                            }} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="APR" className="num" style={{ fontSize: 12 }}>
                      {fmtAPR(Number(d.interest_rate))}
                    </td>
                    <td data-label="Payment" className="num" style={{ fontSize: 12 }}>
                      <MoneyText value={monthlyPayment} currency={d.currency} maskLength={5} skelWidth={72} />
                    </td>
                    <td data-label="Balance" className="num" style={{ fontWeight: 600, color: 'var(--neg)' }}>
                      <MoneyText value={balance} currency={d.currency} maskLength={5} skelWidth={80} />
                    </td>
                    <td data-label="Payoff" className="num" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                      {typeof payoffYears === 'string' ? payoffYears : `${payoffYears}y`}
                    </td>
                    <td className="cell-actions">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingDebt(d)}
                          className="iconbtn"
                          style={{ width: 28, height: 28 }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="iconbtn"
                          style={{ width: 28, height: 28, color: 'var(--neg)' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddDebtDialog userId={userId} defaultCurrency={currency} onClose={() => setShowAdd(false)} />
      )}
      {editingDebt && (
        <EditDebtDialog debt={editingDebt} onClose={() => setEditingDebt(null)} />
      )}
    </>
  )
}
