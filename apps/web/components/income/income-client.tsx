'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@networth/utils'
import { INCOME_FREQUENCY_LABELS } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { Income, CurrencyCode, IncomeFrequency } from '@networth/types'

interface Props {
  income: Income[]
  userId: string
  currency: CurrencyCode
}

const FREQUENCIES: IncomeFrequency[] = [
  'one_time', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually',
]

function annualize(amount: number, frequency: IncomeFrequency): number {
  const multipliers: Record<IncomeFrequency, number> = {
    one_time: 1,
    daily: 365,
    weekly: 52,
    biweekly: 26,
    monthly: 12,
    quarterly: 4,
    annually: 1,
  }
  return amount * multipliers[frequency]
}

export function IncomeClient({ income, userId, currency }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [freq, setFreq] = useState<IncomeFrequency>('monthly')
  const [incCurrency, setIncCurrency] = useState<CurrencyCode>(currency)
  const [notes, setNotes] = useState('')

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('income').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const totalMonthly = income
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + annualize(Number(i.amount), i.frequency) / 12, 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('income').insert({
      user_id: userId,
      source,
      amount: parseFloat(amount),
      currency: incCurrency,
      frequency: freq,
      notes: notes || null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    setShowAdd(false)
    setSource('')
    setAmount('')
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
      <div
        className="p-5 rounded-xl flex items-center justify-between"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Monthly income (est.)
          </p>
          <p className="text-2xl font-bold mt-1">
            {hideAmounts ? '••••••' : formatCurrency(totalMonthly, currency)}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={14} /> Add source
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">New income source</h2>
            <button onClick={() => setShowAdd(false)} style={{ color: 'var(--color-muted-foreground)' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Source</label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Salary, Freelance, Dividends…"
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="3000"
                  min="0"
                  step="any"
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Frequency</label>
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as IncomeFrequency)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{INCOME_FREQUENCY_LABELS[f]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency</label>
                <select
                  value={incCurrency}
                  onChange={(e) => setIncCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  {['USD', 'KZT', 'RUB', 'EUR', 'GBP'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Income list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {income.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No income sources yet.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Source', 'Amount', 'Frequency', 'Annual', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {income.map((i) => (
                <tr key={i.id} className="hover:bg-white/5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-5 py-3 font-medium">{i.source}</td>
                  <td className="px-5 py-3">
                    {hideAmounts ? '••••' : formatCurrency(Number(i.amount), i.currency)}
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                    {INCOME_FREQUENCY_LABELS[i.frequency]}
                  </td>
                  <td className="px-5 py-3">
                    {hideAmounts ? '••••••' : formatCurrency(annualize(Number(i.amount), i.frequency), i.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: i.is_active ? 'rgba(34,197,94,0.15)' : 'var(--color-muted)',
                        color: i.is_active ? 'var(--color-success)' : 'var(--color-muted-foreground)',
                      }}
                    >
                      {i.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleDelete(i.id)}
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
