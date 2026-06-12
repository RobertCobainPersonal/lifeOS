import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SlippingCard from '@/components/SlippingCard'
import BottomNav from '@/components/BottomNav'

export default async function SlippingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [settingsResult, inboxCountResult] = await Promise.all([
    supabase.from('settings').select('slipping_days').eq('id', 1).single(),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])

  const slippingDays = settingsResult.data?.slipping_days ?? 5
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() - slippingDays)

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, energy, domain, due_date, last_touched_at')
    .eq('status', 'open')
    .lt('last_touched_at', thresholdDate.toISOString())
    .order('last_touched_at', { ascending: true })

  if (error) throw error

  const inboxCount = inboxCountResult.count ?? 0
  const slippingTasks = tasks ?? []

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Slipping</h1>
          <Link href="/settings" className="text-gray-500 text-sm active:text-gray-300">
            {slippingDays}d threshold
          </Link>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          {slippingTasks.length === 0
            ? 'Nothing slipping — well done.'
            : `${slippingTasks.length} task${slippingTasks.length !== 1 ? 's' : ''} untouched for ${slippingDays}+ days`}
        </p>

        {slippingTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-base">All tasks have been touched recently.</p>
            <p className="text-gray-700 text-sm mt-1">
              Tasks appear here when untouched for {slippingDays} days.
            </p>
          </div>
        ) : (
          slippingTasks.map(task => (
            <SlippingCard
              key={task.id}
              id={task.id}
              title={task.title}
              energy={task.energy}
              domain={task.domain}
              dueDate={task.due_date}
              lastTouchedAt={task.last_touched_at}
            />
          ))
        )}
      </div>

      <BottomNav current="tasks" inboxCount={inboxCount} />
    </div>
  )
}
