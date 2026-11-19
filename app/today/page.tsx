import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonHour, londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'
import { resolveOneThing } from '@/lib/onething'
import { getActivities, getOpenEntry } from '@/lib/time-store'
import { labelOf, resolveEntry } from '@/lib/activities'
import { focusHref } from '@/lib/time'
import { isLoose, planCandidates, type ProjectTask } from '@/lib/projects'
import { freeGaps, nextEvent, type CalendarEvent } from '@/lib/calendar'
import CalendarCard from '@/components/CalendarCard'
import { isOn, reviewDue } from '@/lib/features'
import { sleepLabel } from '@/lib/health'
import NonNegotiables from '@/components/NonNegotiables'
import { dueList } from '@/lib/people'
import NowRow from '@/components/NowRow'
import FuelLine from '@/components/FuelLine'
import { dayTotals } from '@/lib/fuel'
import { describeActivity } from '@/lib/health'
import QuickAdd from '@/components/QuickAdd'
import BottomNav from '@/components/BottomNav'
import OneThingCard, { type OneThingOption } from '@/components/OneThingCard'
import Top3Item from '@/components/Top3Item'
import ClickupTop3Item from '@/components/ClickupTop3Item'
import AdminBatch from '@/components/AdminBatch'
import MorningPlan from '@/components/MorningPlan'
import ResetMyDay from '@/components/ResetMyDay'
import NewTaskForm from '@/components/NewTaskForm'
import DoneList from '@/components/DoneList'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const today = londonToday(now)
  const yesterday = addDays(today, -1)

  const [settingsResult, dayLog, openEntry, activities] = await Promise.all([
    supabase
      .from('settings')
      .select('last_planned_date, slipping_days, features, last_review_date')
      .eq('id', 1)
      .single(),
    getOrCreateDayLog(supabase, today),
    getOpenEntry(supabase),
    getActivities(supabase),
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
    activityResult,
    projectsResult,
    calendarResult,
    habitsResult,
    ticksResult,
    sleepResult,
    peopleResult,
    doneResult,
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        'id, title, energy, domain, due_date, status, is_top3, top3_date, deferred_by_reset, last_touched_at, project_id, band, project_sort, completed_at, created_at'
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

    // Most recent workout in the last three days
    supabase
      .from('activities')
      .select('type, day, distance_m, moving_seconds')
      .gte('day', addDays(today, -3))
      .lte('day', today)
      .order('started_at', { ascending: false })
      .limit(1),

    supabase.from('projects').select('id, name, is_focus, archived'),

    supabase
      .from('calendar_events')
      .select('source, source_id, day, starts_at, ends_at, all_day, title, location, calendar')
      .eq('day', today)
      .order('starts_at'),

    // Optional features: each query is skipped while its switch is off
    isOn(settings?.features, 'non_negotiables')
      ? supabase.from('habits').select('id, name').eq('archived', false).order('sort')
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    isOn(settings?.features, 'non_negotiables')
      ? supabase.from('habit_ticks').select('habit_id').eq('day', today)
      : Promise.resolve({ data: [] as { habit_id: string }[] }),
    isOn(settings?.features, 'sleep_line')
      ? supabase
          .from('daily_health')
          .select('day, sleep_minutes')
          .gte('day', addDays(today, -1))
          .not('sleep_minutes', 'is', null)
          .order('day', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { day: string; sleep_minutes: number | null }[] }),
    isOn(settings?.features, 'people')
      ? supabase
          .from('people')
          .select('name, cadence_days, last_contact, created_at')
          .eq('archived', false)
      : Promise.resolve({
          data: [] as { name: string; cadence_days: number; last_contact: string | null; created_at: string }[],
        }),
    supabase.from('done_entries').select('id, text').eq('day', today).order('created_at'),
  ])
  const doneToday = doneResult.data ?? []

  const allOpen = allOpenResult.data ?? []
  const fuel = dayTotals(foodResult.data ?? [])
  const latestActivity = activityResult.data?.[0] ?? null
  const tickedToday = new Set((ticksResult.data ?? []).map(t => t.habit_id))
  const nonNegotiables = (habitsResult.data ?? []).map(h => ({
    id: h.id,
    name: h.name,
    done: tickedToday.has(h.id),
  }))
  const lastSleep = sleepResult.data?.[0]?.sleep_minutes ?? null
  const hello = dueList(peopleResult.data ?? [], today)

  // Today's calendar, as sent from the phone
  const calendar = (calendarResult.data ?? []) as CalendarEvent[]
  const upcoming = nextEvent(calendar, now)
  const timedLeft = calendar.filter(e => !e.all_day && new Date(e.ends_at) > now).length
  const gaps = freeGaps(calendar, today, now)
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
  // Focus can start from the one thing or any Top 3 item, unless a session is already running
  const canFocus = openEntry?.mode !== 'focus'

  // Project tasks stay on their project page: only loose tasks feed the lists below
  const loose = allOpen.filter(isLoose)
  const projectPicks = planCandidates(projectsResult.data ?? [], allOpen as ProjectTask[])
  const projectPickName = new Map(projectPicks.map(c => [c.task.id, c.projectName]))

  // Admin batch: open admin tasks, due today or undated, not in today's top3
  const adminBatch = loose
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
  type PlanCategory =
    | 'tomorrow_pick'
    | 'yesterday'
    | 'deferred'
    | 'due_today'
    | 'slipping'
    | 'project'
  const categoryOf = (t: (typeof allOpen)[number]): PlanCategory | null => {
    if (t.id === dayLog.one_thing_task_id) return 'tomorrow_pick'
    if (yesterdayTop3Ids.has(t.id)) return 'yesterday'
    // A project offers one next action; the rest of its list never appears here
    if (!isLoose(t)) return projectPickName.has(t.id) ? 'project' : null
    if (t.deferred_by_reset) return 'deferred'
    if (t.due_date === today) return 'due_today'
    if (t.last_touched_at < slippingThreshold) return 'slipping'
    return null
  }
  const morningPlanTasks = showMorningPlan
    ? allOpen.flatMap(t => {
        const category = categoryOf(t)
        return category
          ? [
              {
                id: t.id,
                title: t.title,
                energy: t.energy,
                domain: t.domain,
                category,
                projectName: projectPickName.get(t.id) ?? null,
              },
            ]
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
  const resetDueToday = loose
    .filter(t => t.due_date === today && !top3Ids.has(t.id) && !adminBatchIds.has(t.id))
    .map(t => ({ id: t.id, title: t.title, energy: t.energy, category: 'due_today' as const }))

  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now)

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-6xl lg:box-content lg:pl-56 lg:pr-8">
      {showMorningPlan && (
        <MorningPlan
          tasks={morningPlanTasks}
          workTasks={clickupDueToday}
          meetings={calendar}
          gaps={gaps}
          preselectedTaskId={dayLog.one_thing_task_id}
        />
      )}

      {/* Fixed above the nav on phones; at the top of the page on wider screens */}
      <div className="sm:px-4 sm:pt-6 lg:px-0">
        <QuickAdd inboxCount={inboxCount} aboveNav />
      </div>

      <div className="px-4 pt-6 sm:pt-0 pb-44 sm:pb-24 lg:px-0 lg:pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Today</h1>
            <p className="text-muted text-sm">
              {dateLabel}
              {latestActivity ? ` · ${describeActivity(latestActivity, today)}` : ''}
              {lastSleep !== null ? ` · Slept ${sleepLabel(lastSleep)}` : ''}
            </p>
          </div>
          <Link
            href="/settings"
            className="text-faint active:text-muted text-xl"
            aria-label="Settings"
          >
            ⚙
          </Link>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 lg:items-start">
          <div>
            <NowRow
              entry={openEntry}
              activityName={openEntry ? labelOf(resolveEntry(openEntry, activities).id, activities) : undefined}
              serverNowMs={now.getTime()}
            />

            {/* Phones: calendar near the top. Wide screens: it moves to the right column. */}
            <div className="lg:hidden">
              <CalendarCard
                events={calendar}
                next={upcoming}
                inProgress={upcoming !== null && new Date(upcoming.starts_at) <= now}
                gaps={gaps}
                remaining={timedLeft}
                today={today}
              />
            </div>

            <OneThingCard
              oneThing={oneThing}
              options={oneThingOptions}
              focusHref={
                oneThing.state === 'open' && canFocus ? focusHref(oneThing.kind, oneThing.id) : null
              }
            />

            <section className="mb-6">
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Top 3</h2>
                {restCount > 0 && <span className="text-xs text-faint">{restCount} left</span>}
              </div>
              {restCount === 0 ? (
                <p className="text-faint text-sm px-1">
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
                      focusHref={canFocus ? focusHref('task', task.id) : null}
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
                      focusHref={canFocus ? focusHref('clickup', task.clickup_id) : null}
                    />
                  ))}
                </div>
              )}
            </section>

            <NewTaskForm />

            <section className="mb-6" aria-labelledby="done-today">
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h2 id="done-today" className="text-xs font-semibold text-muted uppercase tracking-wide">
                  Got done today
                </h2>
                <Link href="/done" className="text-xs text-muted active:text-ink-soft">
                  All →
                </Link>
              </div>
              <div className="bg-card ring-1 ring-line rounded-xl px-4 py-3">
                <DoneList items={doneToday} emptyHint="Add anything you get through, big or small." />
              </div>
            </section>

            <div className="lg:hidden">
              <NonNegotiables items={nonNegotiables} />

              {hello.length > 0 && (
                <Link
                  href="/people"
                  className="mb-6 flex items-center justify-between bg-card ring-1 ring-line rounded-xl px-4 py-3 active:bg-sunk"
                >
                  <span className="text-sm text-ink-soft">
                    <span className="text-muted">Worth a hello</span>{' '}
                    {hello
                      .slice(0, 2)
                      .map(p => p.name)
                      .join(', ')}
                    {hello.length > 2 ? ` +${hello.length - 2}` : ''}
                  </span>
                  <span className="text-faint text-sm">→</span>
                </Link>
              )}

              <FuelLine
                kcal={fuel.kcal}
                protein={fuel.protein_g}
                kcalTarget={dayLog.kcal_target}
                proteinTarget={dayLog.protein_target}
              />
            </div>

            {adminBatch.length > 0 && (
              <section className="mb-6">
                <AdminBatch tasks={adminBatch} />
              </section>
            )}

            {isOn(settings?.features, 'weekly_review') &&
              reviewDue(settings?.last_review_date ?? null, today) && (
                <Link
                  href="/review"
                  className="mb-4 flex items-center justify-between bg-card ring-1 ring-line rounded-xl px-4 py-3 active:bg-sunk"
                >
                  <span className="text-ink-soft text-sm font-medium">Weekly review</span>
                  <span className="text-faint text-sm">→</span>
                </Link>
              )}

            {dayLog.closed_at ? (
              <Link
                href="/today/close"
                className="mb-4 block text-center text-muted text-sm py-3 active:text-ink-soft"
              >
                Day closed ✓
              </Link>
            ) : (
              londonHour(now) >= 16 && (
                <Link
                  href="/today/close"
                  className="mb-4 block text-center bg-card ring-1 ring-line active:bg-sunk rounded-xl py-3.5 text-ink font-medium"
                >
                  Close the day
                </Link>
              )
            )}

            <ResetMyDay top3Tasks={resetTop3} dueTodayTasks={resetDueToday} />
          </div>

          <aside className="hidden lg:block" aria-label="Today at a glance">
            <CalendarCard
              events={calendar}
              next={upcoming}
              inProgress={upcoming !== null && new Date(upcoming.starts_at) <= now}
              gaps={gaps}
              remaining={timedLeft}
              today={today}
              expanded
            />
            <NonNegotiables items={nonNegotiables} />

            {hello.length > 0 && (
              <Link
                href="/people"
                className="mb-6 flex items-center justify-between bg-card ring-1 ring-line rounded-xl px-4 py-3 active:bg-sunk"
              >
                <span className="text-sm text-ink-soft">
                  <span className="text-muted">Worth a hello</span>{' '}
                  {hello
                    .slice(0, 2)
                    .map(p => p.name)
                    .join(', ')}
                  {hello.length > 2 ? ` +${hello.length - 2}` : ''}
                </span>
                <span className="text-faint text-sm">→</span>
              </Link>
            )}

            <FuelLine
              kcal={fuel.kcal}
              protein={fuel.protein_g}
              kcalTarget={dayLog.kcal_target}
              proteinTarget={dayLog.protein_target}
            />
          </aside>
        </div>
      </div>

      <BottomNav current="today" inboxCount={inboxCount} />
    </div>
  )
}
