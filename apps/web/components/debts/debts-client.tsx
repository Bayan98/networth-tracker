'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatPercent } from '@networth/utils'
import { DEBT_TYPE_LABELS } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { Debt, CurrencyCode, DebtType } from '@networth/types'

interface Props {
  debts: Debt[]
  userId: string
  currency: CurrencyCode
}

const DEBT_TYPES: DebtType[] = [
  'mortgage', 'car_loan', 'student_loan', 'credit_card', 'personal_loan', 'other',
]

export function DebtsClient({ debts, userId, currency }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [debtType, setDebtType] = useState<DebtType>('other')
  const [principal, setPrincipal] = useState('')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [debtCurrency, setDebtCurrency] = useState<CurrencyCode>(currency)

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const totalDebt = debts
    .filter((d) => d.is_active)
    .reduce((sum, d) => sum + Number(d.current_balance), 0)

  const totalMinPayment = debts
    .filter((d) => d.is_active)
    .reduce((sum, d) => sum + Number(d.minimum_payment), 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('debts').insert({
      user_id: userId,
      name,
      debt_type: debtType,
      principal_amount: parseFloat(principal),
      current_balance: parseFloat(balance),
      interest_rate: parseFloat(rate) / 100,
      minimum_payment: parseFloat(minPayment) || 0,
      currency: debtCurrency,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    setShowAdd(false)
    setLoading(false)
  }

  const inputStyle = {
    background: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="p-5 rounded-xl"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Total debt</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-danger)' }}>
            {hideAmounts ? '••••••' : formatCurrency(totalDebt, currency)}
          </p>
        </div>
        <div
          className="p-5 rounded-xl"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Min. monthly payment</p>
          <p className="text-2xl font-bold mt-1">
            {hideAmounts ? '••••' : formatCurrency(totalMinPayment, currency)}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={14} /> Add debt
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">New debt</h2>
            <button onClick={() => setShowAdd(false)} style={{ color: 'var(--color-muted-foreground)' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home Mortgage" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <select value={debtType} onChange={(e) => setDebtType(e.target.value as DebtType)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                  {DEBT_TYPES.map((t) => <option key={t} value={t}>{DEBT_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency</label>
                <select value={debtCurrency} onChange={(e) => setDebtCurrency(e.target.value as CurrencyCode)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                  {['USD', 'KZT', 'RUB', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Original amount</label>
                <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="100000" min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current balance</label>
                <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="85000" min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Interest rate (%)</label>
                <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="5.5" min="0" step="any" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Min. payment</label>
                <input type="number" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} placeholder="500" min="0" step="any" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: 'var(--color-accent)', color: '#fff' }}>{loading ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Debts list */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        {debts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No debts recorded.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Name', 'Type', 'Balance', 'Rate', 'Min. payment', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {debts.map((d) => (
                <tr key={d.id} className="hover:bg-white/5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>{DEBT_TYPE_LABELS[d.debt_type]}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-danger)' }}>
                    {hideAmounts ? '••••••' : formatCurrency(Number(d.current_balance), d.currency)}
                  </td>
                  <td className="px-5 py-3">{formatPercent(Number(d.interest_rate) * 100, 2)}</td>
                  <td className="px-5 py-3">
                    {hideAmounts ? '••••' : formatCurrency(Number(d.minimum_payment), d.currency)}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: '#ef4444' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
