'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, CreditCard, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useTodayFx } from '@/lib/hooks/use-today-fx'
import type { Debt, CurrencyCode } from '@networth/types'
import { LoadingText, MoneyText, MoneyTextWithDimFraction } from '@/components/ui/money-text'
import { useSwipeRow } from '@/lib/hooks/use-swipe-row'
import { AddDebtDialog } from './add-debt-dialog'
import { EditDebtDialog } from './edit-debt-dialog'

interface Props {
  debts: Debt[]
  userId: string
  currency: CurrencyCode
}

function DsKpi({ label, value, sub, variant = 'serif' }: {
  label: string
  value: ReactNode
  sub: ReactNode
  variant?: 'serif' | 'mono'
}) {
  return (
    <div className="ds-kpi">
      <div className="ds-kpi-label">{label}</div>
      <div className={`ds-kpi-val ${variant === 'mono' ? 'mono' : ''}`}>{value}</div>
      <div className="ds-kpi-sub">{sub}</div>
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
  const [error, setError] = useState<string | null>(null)

  const _selectedCurrency = useAppStore((s) => s.selectedCurrency)
  const selectedCurrency = isMounted ? _selectedCurrency : currency
  const { fx, loading: fxLoading } = useTodayFx(
    debts.map((debt) => ({ currency: debt.currency })),
    selectedCurrency,
  )

  async function handleDelete(id: string) {
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('debts').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
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
  const activeLabel = `${activeDebts.length} active loan${activeDebts.length !== 1 ? 's' : ''}`

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">Liabilities · Payoff ledger</div>
          <h1>Debts <em>&amp; liabilities.</em></h1>
          <p>Track balances, rates, and payoff progress across every loan.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add debt
        </button>
      </div>

      <div className="stat-grid">
        <DsKpi
          label="Total owed"
          variant="mono"
          value={
            <MoneyTextWithDimFraction
              value={debtTotals.totalDebt}
              currency={selectedCurrency}
              loading={statsLoading}
              maskLength={6}
              skelWidth={140}
              skelHeight={32}
            />
          }
          sub={activeLabel}
        />
        <DsKpi
          label="Monthly payment"
          variant="mono"
          value={
            <MoneyTextWithDimFraction
              value={debtTotals.totalMinPayment}
              currency={selectedCurrency}
              loading={statsLoading}
              maskLength={6}
              skelWidth={120}
              skelHeight={26}
            />
          }
          sub={activeLabel}
        />
        <DsKpi
          label="Weighted APR"
          variant="mono"
          value={
            <LoadingText loading={statsLoading} skelWidth={80} skelHeight={26}>
              {debtTotals.weightedAPR === null ? '—' : fmtAPR(debtTotals.weightedAPR)}
            </LoadingText>
          }
          sub="Fixed + variable"
        />
      </div>

      <div className="table-wrap">
        <div className="ds-positions-head">
          <h3>All <em>debts</em></h3>
          <span className="ds-positions-meta">{debts.length} record{debts.length !== 1 ? 's' : ''}</span>
        </div>
        {error && (
          <div className="callout callout-neg" style={{ margin: '14px var(--density-pad-x) 0' }}>
            {error}
          </div>
        )}
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
              {debts.map((d) => (
                <DebtRow
                  key={d.id}
                  d={d}
                  fmtAPR={fmtAPR}
                  onEdit={() => setEditingDebt(d)}
                  onDelete={() => handleDelete(d.id)}
                />
              ))}
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

interface DebtRowProps {
  d: Debt
  fmtAPR: (rate: number) => string
  onEdit: () => void
  onDelete: () => void
}

function DebtRow({ d, fmtAPR, onEdit, onDelete }: DebtRowProps) {
  const swipe = useSwipeRow()
  const principal = Number(d.principal_amount)
  const balance = Number(d.current_balance)
  const progress = principal > 0 ? Math.max(0, Math.min(100, ((principal - balance) / principal) * 100)) : 0
  const monthlyPayment = Number(d.minimum_payment)
  const payoffLabel = monthlyPayment > 0 ? `${(balance / (monthlyPayment * 12)).toFixed(1)}y` : '—'

  return (
    <tr style={swipe.style} {...swipe.handlers}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--neg-soft)',
              border: '1px solid var(--ink-3)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--neg)',
              flexShrink: 0,
            }}
          >
            <DebtIcon name={d.name} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>{d.name}</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                color: 'var(--ink-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              {progress.toFixed(0)}% paid off
            </div>
            <div className="ds-progress" style={{ width: 160, maxWidth: '100%' }}>
              <span style={{ width: `${progress}%` }} />
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
        {payoffLabel}
      </td>
      <td className="cell-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onEdit}
            className="iconbtn"
            style={{ width: 28, height: 28 }}
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
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
}
