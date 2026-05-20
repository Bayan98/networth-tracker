'use client'

import { useState } from 'react'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { getAuthCallbackUrl } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/client'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl('/dashboard'),
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div
        className="p-4 rounded-lg text-sm text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <p className="font-medium mb-1">Check your email</p>
        <p style={{ color: 'var(--color-muted-foreground)' }}>
          We sent a confirmation link to <strong>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton label="Sign up with Google" />
      <div className="auth-divider">
        <span>or</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            minLength={8}
            required
            className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
