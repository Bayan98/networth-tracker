'use client'

import { useState } from 'react'
import { Chrome } from 'lucide-react'
import { getAuthCallbackUrl } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/client'

type Props = {
  label?: string
}

export function GoogleSignInButton({ label = 'Continue with Google' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthCallbackUrl('/dashboard'),
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-oauth">
      <button
        type="button"
        className="btn btn-secondary auth-provider-button"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <Chrome size={16} aria-hidden="true" />
        {loading ? 'Opening Google...' : label}
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
