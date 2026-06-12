import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SettingsForm from '@/components/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: settings } = await supabase
    .from('settings')
    .select('slipping_days, clickup_token_set')
    .eq('id', 1)
    .single()

  const slippingDays = settings?.slipping_days ?? 5
  const hasClickUp = !!process.env.CLICKUP_API_TOKEN

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/today" className="text-gray-500 active:text-gray-300 text-sm">
            ← Today
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
            Slipping threshold
          </h2>
          <div className="bg-gray-900 rounded-xl px-4 py-4">
            <p className="text-gray-400 text-sm mb-3">
              Tasks appear in Slipping after this many days without any activity.
            </p>
            <SettingsForm currentDays={slippingDays} />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
            ClickUp
          </h2>
          <div className="bg-gray-900 rounded-xl px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Work tasks</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {hasClickUp ? 'Personal API token configured' : 'CLICKUP_API_TOKEN not set'}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              hasClickUp
                ? 'bg-green-900/50 text-green-400'
                : 'bg-gray-800 text-gray-500'
            }`}>
              {hasClickUp ? 'Connected' : 'Not configured'}
            </span>
          </div>
          {hasClickUp && (
            <p className="text-gray-700 text-xs mt-2 px-1">
              Syncs when you open the ClickUp page. To reconnect, update CLICKUP_API_TOKEN in your environment.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
