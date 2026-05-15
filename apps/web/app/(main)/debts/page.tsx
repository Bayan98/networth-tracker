import { createClient } from '@/lib/supabase/server'
import { DebtsClient } from '@/components/debts/debts-client'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

export default async function DebtsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: debts, error: debtsError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('debts')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ])

  if (debtsError) throw new Error(debtsError.message)
  if (profileError) throw new Error(profileError.message)

  return (
    <DebtsClient
      debts={debts ?? []}
      userId={user!.id}
      currency={(profile?.default_currency ?? 'USD') as CurrencyCode}
    />
  )
}
