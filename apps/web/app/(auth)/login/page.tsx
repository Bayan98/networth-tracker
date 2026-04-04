import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In — Networth Tracker',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Sign in to your account
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          No account?{' '}
          <a href="/signup" className="underline underline-offset-4 hover:text-white">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}
