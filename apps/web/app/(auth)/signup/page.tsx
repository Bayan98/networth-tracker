import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Sign Up — Networth Tracker',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Start tracking your net worth today
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Already have an account?{' '}
          <a href="/login" className="underline underline-offset-4 hover:text-white">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
