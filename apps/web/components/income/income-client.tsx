'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, INCOME_FREQUENCY_LABELS, TRANSACTION_TYPE_LABELS } from '@networth/utils'
import { useAppStore } from '@/lib/store'
import type { ScheduledEvent, CurrencyCode, IncomeFrequency, TransactionType } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

interface Props {
  events: ScheduledEvent[]
  userId: string
  currency: CurrencyCode
}

const FREQUENCIES: IncomeFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annually']

const EVENT_TYPES: TransactionType[] = ['dividend', 'deposit', 'withdrawal']

function annualize(amount: number, frequency: IncomeFrequency): number {
  const multipliers: Record<IncomeFrequency, number> = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    annually: 1,
  }
  return amount * (multipliers[frequency] ?? 1)
}

export function ScheduledEventsClient({ events, userId, currency }: Props) {
  const router = useRouter()
  const hideAmounts = useAppStore((s) => s.hideAmounts)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [txType, setTxType] = useState<TransactionType>('dividend')
  const [amountType, setAmountType] = useState<'fixed' | 'percent'>('fixed')
  const [amount, setAmount] = useState('')
  const [freq, setFreq] = useState<IncomeFrequency>('monthly')
  const [eventCurrency, setEventCurrency] = useState<CurrencyCode>(currency)
  const [notes, setNotes] = useState('')

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
    if (!error) router.refresh()
  }

  const activeIncome = events.filter(
    (e) => e.is_active && e.transaction_type !== 'withdrawal',
  )
  const totalMonthly = activeIncome.reduce(
    (sum, e) => sum + annualize(Number(e.amount), e.frequency) / 12,
    0,
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('scheduled_events').insert({
      user_id: userId,
      name,
      transaction_type: txType,
      amount: parseFloat(amount),
      amount_type: amountType,
      currency: eventCurrency,
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
    setName('')
    setAmount('')
    setAmountType('fixed')
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
          <Plus size={14} /> Add event
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">New scheduled event</h2>
            <button onClick={() => setShowAdd(false)} style={{ color: 'var(--color-muted-foreground)' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Monthly salary, Mortgage payment…"
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as TransactionType)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t] ?? t}</option>
                  ))}
                </select>
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
                <label className="text-sm font-medium">Amount type</label>
                <select
                  value={amountType}
                  onChange={(e) => setAmountType(e.target.value as 'fixed' | 'percent')}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="fixed">Fixed</option>
                  <option value="percent">Percent (%)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency</label>
                <CurrencyPicker
                  value={eventCurrency}
                  onChange={(c) => setEventCurrency(c as CurrencyCode)}
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
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

      {/* Events list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No scheduled events yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Name / Holding</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Type</th>
                  <th className="px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Amount</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Frequency</th>
                  <th className="hidden md:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Annual</th>
                  <th className="hidden sm:table-cell px-4 md:px-5 py-3 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Status</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 md:px-5 py-3 font-medium">
                      {ev.holding_id ? (
                        <Link
                          href={`/holdings/${ev.holding_id}`}
                          className="hover:underline"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {ev.name}
                        </Link>
                      ) : (
                        ev.name
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                      {TRANSACTION_TYPE_LABELS[ev.transaction_type] ?? ev.transaction_type}
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      {hideAmounts ? '••••' : formatCurrency(Number(ev.amount), ev.currency)}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                      {INCOME_FREQUENCY_LABELS[ev.frequency]}
                    </td>
                    <td className="hidden md:table-cell px-4 md:px-5 py-3">
                      {hideAmounts ? '••••••' : formatCurrency(annualize(Number(ev.amount), ev.frequency), ev.currency)}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-5 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: ev.is_active ? 'rgba(34,197,94,0.15)' : 'var(--color-muted)',
                          color: ev.is_active ? 'var(--color-success)' : 'var(--color-muted-foreground)',
                        }}
                      >
                        {ev.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 py-3">
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
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
          </div>
        )}
      </div>
    </div>
  )
}
