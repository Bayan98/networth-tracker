import { createClient } from '@/lib/supabase/server'
import { IncomeClient } from '@/components/income/income-client'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

export default async function IncomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: income }, { data: profile }] = await Promise.all([
    supabase
      .from('income')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Income</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
          Track your income sources
        </p>
      </div>
      <IncomeClient
        income={income ?? []}
        userId={user!.id}
        currency={(profile?.default_currency ?? 'USD') as CurrencyCode}
      />
    </div>
  )
}
