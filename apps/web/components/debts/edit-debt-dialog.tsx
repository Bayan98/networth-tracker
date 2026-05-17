'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Debt, CurrencyCode } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

interface Props {
  debt: Debt
  onClose: () => void
}

export function EditDebtDialog({ debt, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(debt.name)
  const [principal, setPrincipal] = useState(String(debt.principal_amount))
  const [balance, setBalance] = useState(String(debt.current_balance))
  const [rate, setRate] = useState(String(Number(debt.interest_rate) * 100))
  const [minPayment, setMinPayment] = useState(String(debt.minimum_payment))
  const [currency, setCurrency] = useState<CurrencyCode>(debt.currency)
  const [notes, setNotes] = useState(debt.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('debts').update({
      name: name.trim(),
      principal_amount: parseFloat(principal),
      current_balance: parseFloat(balance),
      interest_rate: parseFloat(rate) / 100,
      minimum_payment: parseFloat(minPayment) || 0,
      currency,
      notes: notes.trim() || null,
    }).eq('id', debt.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div
      className="rmodal-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rmodal">
        <div className="rmodal-head">
          <div>
            <div className="rmodal-kicker">Edit liability</div>
            <h2>{debt.name}</h2>
            <div className="rmodal-desc">Update balance, rate, or terms.</div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="rmodal-body">
            <div className="mfield">
              <label className="mfield-label">Name</label>
              <input
                ref={nameRef}
                className="minput"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Home mortgage"
                required
              />
            </div>

            <div className="mfield-row">
              <div>
                <label className="mfield-label">Original amount</label>
                <input
                  className="minput mono"
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  min="0"
                  step="any"
                  required
                />
              </div>
              <div>
                <label className="mfield-label">Current balance</label>
                <input
                  className="minput mono"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  min="0"
                  step="any"
                  required
                />
              </div>
            </div>

            <div className="mfield-row">
              <div>
                <label className="mfield-label">
                  Interest rate <span className="mfield-opt">% APR</span>
                </label>
                <input
                  className="minput mono"
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  min="0"
                  step="any"
                  required
                />
              </div>
              <div>
                <label className="mfield-label">
                  Min. payment <span className="mfield-opt">Optional</span>
                </label>
                <input
                  className="minput mono"
                  type="number"
                  value={minPayment}
                  onChange={(e) => setMinPayment(e.target.value)}
                  min="0"
                  step="any"
                />
              </div>
            </div>

            <div className="mfield">
              <label className="mfield-label">Currency</label>
              <CurrencyPicker
                value={currency}
                onChange={(c) => setCurrency(c as CurrencyCode)}
              />
            </div>

            <div className="mfield" style={{ marginBottom: 0 }}>
              <label className="mfield-label">
                Notes <span className="mfield-opt">Optional</span>
              </label>
              <textarea
                className="minput mtextarea"
                placeholder="Lender, account number, repayment plan…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="merror">{error}</p>}
          </div>

          <div className="rmodal-foot">
            <div className="rmodal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!name.trim() || loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
