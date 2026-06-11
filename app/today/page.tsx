import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuickAdd from '@/components/QuickAdd'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { count, error: countError } = await supabase
    .from('captures')
    .select('*', { count: 'exact', head: true })
    .is('triaged_at', null)

  if (countError) throw countError

  const inboxCount = count ?? 0

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <QuickAdd inboxCount={inboxCount} />
      <div className="px-6 pt-6 pb-28 sm:pb-6">
        <h1 className="text-2xl font-bold mb-1">Today</h1>
        <p className="text-gray-500 text-sm mb-8">Session 2 in progress</p>
        {inboxCount > 0 && (
          <p className="text-gray-400 text-sm">
            {inboxCount} item{inboxCount !== 1 ? 's' : ''} waiting in inbox
          </p>
        )}
      </div>
    </div>
  )
}
