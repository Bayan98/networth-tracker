import { createClient } from '@/lib/supabase/server'
import { ScheduledEventsClient } from '@/components/income/income-client'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

export default async function IncomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: events, error: eventsError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('scheduled_events')
      .select('*, asset:assets(*, portfolio:portfolios(id, name))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ])

  if (eventsError) throw new Error(eventsError.message)
  if (profileError) throw new Error(profileError.message)

  return (
    <ScheduledEventsClient
      events={events ?? []}
      userId={user!.id}
      currency={(profile?.default_currency ?? 'USD') as CurrencyCode}
    />
  )
}
