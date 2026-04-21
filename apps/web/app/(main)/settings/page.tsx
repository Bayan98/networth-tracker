import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/settings/settings-client'
import { ImportAssets } from '@/components/settings/import-assets'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <>
      <div className="page-head">
        <div>
          <div className="empty-label">You</div>
          <h1>Settings.</h1>
        </div>
      </div>
      <SettingsClient
        profile={profile}
        userEmail={user?.email ?? ''}
      />
      <ImportAssets />
    </>
  )
}
