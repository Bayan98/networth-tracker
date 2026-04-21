import { createClient } from '@/lib/supabase/server'
import { ScheduledEventsClient } from '@/components/income/income-client'
import type { CurrencyCode } from '@networth/types'

export const revalidate = 300

export default async function IncomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: events }, { data: profile }] = await Promise.all([
    supabase
      .from('scheduled_events')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ])

  return (
    <ScheduledEventsClient
      events={events ?? []}
      userId={user!.id}
      currency={(profile?.default_currency ?? 'USD') as CurrencyCode}
    />
  )
}
