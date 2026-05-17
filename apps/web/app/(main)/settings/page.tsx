import { createClient } from '@/lib/supabase/server'
import { DangerZone, SettingsClient } from '@/components/settings/settings-client'
import { ImportAssets } from '@/components/settings/import-assets'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile, error: profileError }, { data: portfolios, error: portfoliosError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('portfolios').select('*').eq('user_id', user!.id).order('created_at'),
  ])

  if (profileError) throw new Error(profileError.message)
  if (portfoliosError) throw new Error(portfoliosError.message)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-kicker">You · Preferences</div>
          <h1>Settings <em>&amp; preferences.</em></h1>
          <p>Profile, currency, appearance, and a destructive lever for clean starts.</p>
        </div>
      </div>
      <SettingsClient
        profile={profile}
        userEmail={user?.email ?? ''}
      />
      <ImportAssets portfolios={portfolios ?? []} userId={user!.id} />
      <DangerZone />
    </>
  )
}
