import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonHour, londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'
import { resolveOneThing } from '@/lib/onething'
import { getOpenEntry } from '@/lib/time-store'
import NowRow from '@/components/NowRow'
import FuelLine from '@/components/FuelLine'
import { dayTotals } from '@/lib/fuel'
import QuickAdd from '@/components/QuickAdd'
import BottomNav from '@/components/BottomNav'
import OneThingCard, { type OneThingOption } from '@/components/OneThingCard'
import Top3Item from '@/components/Top3Item'
import ClickupTop3Item from '@/components/ClickupTop3Item'
import AdminBatch from '@/components/AdminBatch'
import MorningPlan from '@/components/MorningPlan'
import ResetMyDay from '@/components/ResetMyDay'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const today = londonToday(now)
  const yesterday = addDays(today, -1)

  const [settingsResult, dayLog, openEntry] = await Promise.all([
    supabase.from('settings').select('last_planned_date, slipping_days').eq('id', 1).single(),
    getOrCreateDayLog(supabase, today),
    getOpenEntry(supabase),
  ])
  const settings = settingsResult.data
  const slippingThreshold = new Date(
    now.getTime() - (settings?.slipping_days ?? 5) * 86_400_000
  ).toISOString()

  const [
    allOpenResult,
    oneThingTaskResult,
    inboxResult,
    yesterdayTop3Result,
    clickupTop3Result,
    clickupDueTodayResult,
    foodResult,
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        'id, title, energy, domain, due_date, status, is_top3, top3_date, deferred_by_reset, last_touched_at'
      )
      .eq('status', 'open'),

    // The one thing is fetched whatever its status, so a completed one still shows as done
    dayLog.one_thing_task_id
      ? supabase.from('tasks').select('id, title, status').eq('id', dayLog.one_thing_task_id)
      : Promise.resolve({ data: [] as { id: string; title: string; status: string }[] }),

    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),

    supabase
      .from('tasks')
      .select('id')
      .eq('is_top3', true)
      .eq('top3_date', yesterday)
      .eq('status', 'open'),

    supabase
      .from('clickup_tasks')
      .select('clickup_id, title, status, due_date, url, list_name')
      .eq('pinned_top3_date', today),

    // Work items due today are offered in the morning plan only, never on Home
    supabase
      .from('clickup_tasks')
      .select('clickup_id, title, list_name')
      .eq('due_date', today),

    supabase.from('food_entries').select('kcal, protein_g').eq('day', today),
  ])

  const allOpen = allOpenResult.data ?? []
  const fuel = dayTotals(foodResult.data ?? [])
  const inboxCount = inboxResult.count ?? 0
  const clickupTop3 = clickupTop3Result.data ?? []
  const clickupDueToday = clickupDueTodayResult.data ?? []
  const yesterdayTop3Ids = new Set((yesterdayTop3Result.data ?? []).map(t => t.id))

  const top3Tasks = allOpen.filter(t => t.is_top3 && t.top3_date === today)
  const top3Ids = new Set(top3Tasks.map(t => t.id))

  const oneThing = resolveOneThing(dayLog, oneThingTaskResult.data ?? [], clickupTop3)
  const isOneThing = (kind: 'task' | 'clickup', id: string) =>
    oneThing.state !== 'none' && oneThing.kind === kind && oneThing.id === id

  const oneThingOptions: OneThingOption[] = [
    ...top3Tasks.map(t => ({ kind: 'task' as const, id: t.id, title: t.title })),
    ...clickupTop3.map(t => ({
      kind: 'clickup' as const,
      id: t.clickup_id,
      title: t.title ?? 'Work item',
    })),
  ]

  const restTop3Tasks = top3Tasks.filter(t => !isOneThing('task', t.id))
  const restClickupTop3 = clickupTop3.filter(t => !isOneThing('clickup', t.clickup_id))
  const restCount = restTop3Tasks.length + restClickupTop3.length

  // Admin batch: open admin tasks, due today or undated, not in today's top3
  const adminBatch = allOpen
    .filter(
      t =>
        t.energy === 'admin' &&
        (t.due_date === null || t.due_date <= today) &&
        !top3Ids.has(t.id)
    )
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const adminBatchIds = new Set(adminBatch.map(t => t.id))

  // Morning plan: show on first open of the day
  const showMorningPlan = settings?.last_planned_date !== today
  type PlanCategory = 'tomorrow_pick' | 'yesterday' | 'deferred' | 'due_today' | 'slipping'
  const categoryOf = (t: (typeof allOpen)[number]): PlanCategory | null => {
    if (t.id === dayLog.one_thing_task_id) return 'tomorrow_pick'
    if (yesterdayTop3Ids.has(t.id)) return 'yesterday'
    if (t.deferred_by_reset) return 'deferred'
    if (t.due_date === today) return 'due_today'
    if (t.last_touched_at < slippingThreshold) return 'slipping'
    return null
  }
  const morningPlanTasks = showMorningPlan
    ? allOpen.flatMap(t => {
        const category = categoryOf(t)
        return category
          ? [{ id: t.id, title: t.title, energy: t.energy, domain: t.domain, category }]
          : []
      })
    : []

  // Reset My Day: local top3 + local due today tasks
  const resetTop3 = top3Tasks.map(t => ({
    id: t.id,
    title: t.title,
    energy: t.energy,
    category: 'top3' as const,
  }))
  const resetDueToday = allOpen
    .filter(t => t.due_date === today && !top3Ids.has(t.id) && !adminBatchIds.has(t.id))
    .map(t => ({ id: t.id, title: t.title, energy: t.energy, category: 'due_today' as const }))

  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now)

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {showMorningPlan && (
        <MorningPlan
          tasks={morningPlanTasks}
          workTasks={clickupDueToday}
          preselectedTaskId={dayLog.one_thing_task_id}
        />
      )}

      <div className="px-4 pt-6 pb-44 sm:pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Today</h1>
            <p className="text-gray-500 text-sm">{dateLabel}</p>
          </div>
          <Link
            href="/settings"
            className="text-gray-600 active:text-gray-400 text-xl"
            aria-label="Settings"
          >
            ⚙
          </Link>
        </div>

        <NowRow entry={openEntry} serverNowMs={now.getTime()} />

        <OneThingCard
          oneThing={oneThing}
          options={oneThingOptions}
          focusHref={
            oneThing.state === 'open' && openEntry?.mode !== 'focus'
              ? `/time?${oneThing.kind === 'task' ? 'task' : 'clickup'}=${encodeURIComponent(oneThing.id)}`
              : null
          }
        />

        <section className="mb-6">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top 3</h2>
            {restCount > 0 && <span className="text-xs text-gray-600">{restCount} left</span>}
          </div>
          {restCount === 0 ? (
            <p className="text-gray-600 text-sm px-1">
              {oneThingOptions.length === 0
                ? 'Nothing pinned. Star tasks from More → Tasks.'
                : 'Nothing else pinned.'}
            </p>
          ) : (
            <div>
              {restTop3Tasks.map(task => (
                <Top3Item
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  energy={task.energy}
                  dueDate={task.due_date}
                />
              ))}
              {restClickupTop3.map(task => (
                <ClickupTop3Item
                  key={task.clickup_id}
                  clickupId={task.clickup_id}
                  title={task.title}
                  status={task.status}
                  dueDate={task.due_date}
                  url={task.url}
                  listName={task.list_name}
                />
              ))}
            </div>
          )}
        </section>

        <FuelLine
          kcal={fuel.kcal}
          protein={fuel.protein_g}
          kcalTarget={dayLog.kcal_target}
          proteinTarget={dayLog.protein_target}
        />

        {adminBatch.length > 0 && (
          <section className="mb-6">
            <AdminBatch tasks={adminBatch} />
          </section>
        )}

        {dayLog.closed_at ? (
          <Link
            href="/today/close"
            className="mb-4 block text-center text-gray-500 text-sm py-3 active:text-gray-300"
          >
            Day closed ✓
          </Link>
        ) : (
          londonHour(now) >= 16 && (
            <Link
              href="/today/close"
              className="mb-4 block text-center bg-gray-900 active:bg-gray-800 rounded-xl py-3.5 text-white font-medium"
            >
              Close the day
            </Link>
          )
        )}

        <ResetMyDay top3Tasks={resetTop3} dueTodayTasks={resetDueToday} />
      </div>

      <QuickAdd inboxCount={inboxCount} aboveNav />
      <BottomNav current="today" inboxCount={inboxCount} />
    </div>
  )
}
