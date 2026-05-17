'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CurrencyCode } from '@networth/types'
import { CurrencyPicker } from '@/components/ui/currency-picker'

interface Props {
  userId: string
  defaultCurrency: CurrencyCode
  onClose: () => void
}

export function AddDebtDialog({ userId, defaultCurrency, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [principal, setPrincipal] = useState('')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency)
  const [notes, setNotes] = useState('')
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
    const { error } = await supabase.from('debts').insert({
      user_id: userId,
      name: name.trim(),
      principal_amount: parseFloat(principal),
      current_balance: parseFloat(balance),
      interest_rate: parseFloat(rate) / 100,
      minimum_payment: parseFloat(minPayment) || 0,
      currency,
      notes: notes.trim() || null,
    })

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
            <div className="rmodal-kicker">Liability</div>
            <h2>Add a <em>debt</em></h2>
            <div className="rmodal-desc">
              Track a mortgage, loan, or credit card so it nets against your assets.
            </div>
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
                  placeholder="100000"
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
                  placeholder="85000"
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
                  placeholder="5.5"
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
                  placeholder="500"
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
                {loading ? 'Adding…' : 'Add debt'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
