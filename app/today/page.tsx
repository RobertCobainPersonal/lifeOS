import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      <div className="px-4 pt-6 pb-28 sm:pb-6">
        <h1 className="text-2xl font-bold mb-6">Today</h1>

        <div className="flex flex-col gap-3 mb-8">
          <Link
            href="/inbox"
            className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-4 active:bg-gray-800 transition-colors"
          >
            <span className="text-white font-medium">Inbox</span>
            {inboxCount > 0 ? (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
                {inboxCount > 99 ? '99+' : inboxCount}
              </span>
            ) : (
              <span className="text-gray-600 text-sm">Clear</span>
            )}
          </Link>

          <Link
            href="/tasks"
            className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-4 active:bg-gray-800 transition-colors"
          >
            <span className="text-white font-medium">Tasks</span>
            <span className="text-gray-600 text-sm">→</span>
          </Link>
        </div>

        <p className="text-gray-700 text-xs">
          Session 3 complete — full Today view in Session 4
        </p>
      </div>
    </div>
  )
}
