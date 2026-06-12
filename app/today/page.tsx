import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QuickAdd from '@/components/QuickAdd'
import Top3Item from '@/components/Top3Item'
import AdminBatch from '@/components/AdminBatch'
import DueItem from '@/components/DueItem'
import MorningPlan from '@/components/MorningPlan'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = new Date().toISOString().split('T')[0]
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`

  const [
    top3Result,
    allOpenResult,
    doneResult,
    inboxResult,
    settingsResult,
    yesterdayTop3Result,
    deferredResult,
  ] = await Promise.all([
    // Today's Top 3 (open)
    supabase
      .from('tasks')
      .select('id, title, energy, due_date')
      .eq('is_top3', true)
      .eq('top3_date', today)
      .eq('status', 'open')
      .order('created_at'),

    // All open tasks for filtering into sections
    supabase
      .from('tasks')
      .select('id, title, energy, domain, due_date, is_top3, top3_date')
      .eq('status', 'open'),

    // Tasks completed today for done footer
    supabase
      .from('tasks')
      .select('id, title')
      .eq('status', 'done')
      .gte('completed_at', todayStart)
      .order('completed_at', { ascending: false }),

    // Inbox count
    supabase
      .from('captures')
      .select('*', { count: 'exact', head: true })
      .is('triaged_at', null),

    // Settings (morning plan date)
    supabase.from('settings').select('last_planned_date').eq('id', 1).single(),

    // Yesterday's unfinished Top 3 (morning plan)
    supabase
      .from('tasks')
      .select('id, title, energy, domain')
      .eq('is_top3', true)
      .eq('top3_date', yesterday)
      .eq('status', 'open'),

    // Deferred by reset (morning plan)
    supabase
      .from('tasks')
      .select('id, title, energy, domain')
      .eq('deferred_by_reset', true)
      .eq('status', 'open'),
  ])

  const top3Tasks = top3Result.data ?? []
  const allOpen = allOpenResult.data ?? []
  const doneTodayTasks = doneResult.data ?? []
  const inboxCount = inboxResult.count ?? 0
  const settings = settingsResult.data
  const yesterdayTop3 = yesterdayTop3Result.data ?? []
  const deferred = deferredResult.data ?? []

  // Admin batch: open admin tasks, due today or undated, not in today's top3
  const top3Ids = new Set(top3Tasks.map(t => t.id))
  const adminBatch = allOpen
    .filter(
      t =>
        t.energy === 'admin' &&
        (t.due_date === null || t.due_date <= today) &&
        !top3Ids.has(t.id)
    )
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date < b.due_date ? -1 : 1
    })

  // Due today: open tasks due today, not in top3, not in admin batch
  const adminBatchIds = new Set(adminBatch.map(t => t.id))
  const dueToday = allOpen.filter(
    t =>
      t.due_date === today &&
      !top3Ids.has(t.id) &&
      !adminBatchIds.has(t.id)
  )

  // Show morning plan on first open of the day
  const showMorningPlan = settings?.last_planned_date !== today

  // Build morning plan task list (deduped, excluding already-top3-today)
  const seenIds = new Set<string>()
  type PlanTask = {
    id: string
    title: string
    energy: string | null
    domain: string | null
    category: 'yesterday' | 'deferred' | 'due_today'
  }
  const morningPlanTasks: PlanTask[] = []

  const alreadyTop3TodayIds = new Set(
    allOpen.filter(t => t.is_top3 && t.top3_date === today).map(t => t.id)
  )

  for (const t of yesterdayTop3) {
    if (!seenIds.has(t.id) && !alreadyTop3TodayIds.has(t.id)) {
      seenIds.add(t.id)
      morningPlanTasks.push({ ...t, category: 'yesterday' })
    }
  }
  for (const t of deferred) {
    if (!seenIds.has(t.id) && !alreadyTop3TodayIds.has(t.id)) {
      seenIds.add(t.id)
      morningPlanTasks.push({ ...t, category: 'deferred' })
    }
  }
  for (const t of allOpen.filter(t => t.due_date === today)) {
    if (!seenIds.has(t.id) && !alreadyTop3TodayIds.has(t.id)) {
      seenIds.add(t.id)
      morningPlanTasks.push({
        id: t.id,
        title: t.title,
        energy: t.energy,
        domain: t.domain,
        category: 'due_today',
      })
    }
  }

  const top3Count = top3Tasks.length

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {showMorningPlan && <MorningPlan tasks={morningPlanTasks} />}

      <QuickAdd inboxCount={inboxCount} />

      <div className="px-4 pt-6 pb-28 sm:pb-6">
        <h1 className="text-2xl font-bold mb-6">Today</h1>

        {/* Top 3 — visually dominant */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            Top 3
          </h2>
          {top3Tasks.length === 0 ? (
            <div className="bg-gray-900 rounded-xl px-4 py-5 text-center">
              <p className="text-gray-600 text-sm">No Top 3 set for today.</p>
              <p className="text-gray-700 text-xs mt-1">
                Use the morning plan or star tasks from the Tasks list.
              </p>
            </div>
          ) : (
            <div>
              {top3Tasks.map(task => (
                <Top3Item
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  energy={task.energy}
                  dueDate={task.due_date}
                />
              ))}
            </div>
          )}
        </section>

        {/* Admin batch — quiet until expanded */}
        {adminBatch.length > 0 && (
          <section className="mb-6">
            <AdminBatch tasks={adminBatch} />
          </section>
        )}

        {/* Due today — deep tasks not already in Top 3 or Admin batch */}
        {dueToday.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              Due Today
            </h2>
            <div className="bg-gray-900 rounded-xl px-4">
              {dueToday.map(task => (
                <DueItem
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  energy={task.energy}
                  top3Count={top3Count}
                />
              ))}
            </div>
          </section>
        )}

        {/* Inbox + Tasks nav */}
        <div className="flex flex-col gap-3 mb-6">
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

        {/* Done today footer */}
        {doneTodayTasks.length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wide mb-2">
              Done today · {doneTodayTasks.length}
            </p>
            <div className="space-y-1.5">
              {doneTodayTasks.map(t => (
                <p key={t.id} className="text-gray-700 text-sm line-through">
                  {t.title}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
