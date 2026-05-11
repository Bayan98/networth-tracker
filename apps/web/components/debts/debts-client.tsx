'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, CreditCard, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAmountDisplay } from '@/lib/hooks/use-amount-display'
import type { Debt, CurrencyCode } from '@networth/types'
import { AddDebtDialog } from './add-debt-dialog'
import { EditDebtDialog } from './edit-debt-dialog'

interface Props {
  debts: Debt[]
  userId: string
  currency: CurrencyCode
}

function MiniStat({ label, value, sub, trend }: {
  label: string; value: string; sub: string; trend?: 'pos' | 'neg'
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
  const router = useRouter()
  const { displayPrice } = useAmountDisplay()
  const [showAdd, setShowAdd] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const activeDebts = debts.filter((d) => d.is_active)
  const totalDebt = activeDebts.reduce((sum, d) => sum + Number(d.current_balance), 0)
  const totalMinPayment = activeDebts.reduce((sum, d) => sum + Number(d.minimum_payment), 0)

  const weightedAPR = totalDebt > 0
    ? activeDebts.reduce((sum, d) => sum + Number(d.interest_rate) * Number(d.current_balance), 0) / totalDebt
    : 0

  function fmtAPR(rate: number) {
    return `${(rate * 100).toFixed(2)}%`
  }

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--density-gap)' }}>
        <MiniStat
          label="Total owed"
          value={displayPrice(totalDebt, currency, { maskLength: 6 })}
          sub={`${activeDebts.length} active loan${activeDebts.length !== 1 ? 's' : ''}`}
          trend="neg"
        />
        <MiniStat
          label="Monthly payment"
          value={displayPrice(totalMinPayment, currency)}
          sub={`${activeDebts.length} active loan${activeDebts.length !== 1 ? 's' : ''}`}
        />
        <MiniStat
          label="Weighted APR"
          value={fmtAPR(weightedAPR)}
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
                    <td className="num" style={{ fontSize: 12 }}>
                      {fmtAPR(Number(d.interest_rate))}
                    </td>
                    <td className="num" style={{ fontSize: 12 }}>
                      {displayPrice(monthlyPayment, d.currency)}
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--neg)' }}>
                      {displayPrice(balance, d.currency)}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                      {typeof payoffYears === 'string' ? payoffYears : `${payoffYears}y`}
                    </td>
                    <td style={{ width: 60 }}>
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
