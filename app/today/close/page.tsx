import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonDayStartIso, londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'
import { DEFAULT_PROMPTS, summariseEntries } from '@/lib/closeout'
import { activityKey, breakdown, groupKey } from '@/lib/activities'
import { dayTotals } from '@/lib/fuel'
import { ENTRY_COLUMNS, getActivities } from '@/lib/time-store'
import type { TimeEntry } from '@/lib/types'
import DoneList from '@/components/DoneList'
import CloseoutForm from '@/components/CloseoutForm'

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function ClosePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const today = londonToday(now)
  const tomorrow = addDays(today, 1)

  const [dayLog, settings, entriesResult, openTasks, doneToday, tomorrowLog, food, doneLog] = await Promise.all([
    getOrCreateDayLog(supabase, today),
    supabase.from('settings').select('journal_prompts').eq('id', 1).single(),
    supabase.from('time_entries').select(ENTRY_COLUMNS).eq('day', today),
    supabase
      .from('tasks')
      .select('id, title, is_top3, top3_date, project_id, band')
      .eq('status', 'open')
      .order('created_at'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', londonDayStartIso(today)),
    supabase.from('day_log').select('one_thing_task_id').eq('day', tomorrow).maybeSingle(),
    supabase.from('food_entries').select('kcal, protein_g').eq('day', today),
    supabase.from('done_entries').select('id, text').eq('day', today).order('created_at'),
  ])
  const foodEntries = food.data ?? []
  const fuel = dayTotals(foodEntries)

  // A day that is already closed keeps the prompts it was answered against
  const prompts: string[] =
    dayLog.closeout?.prompts ??
    (Array.isArray(settings.data?.journal_prompts) ? settings.data.journal_prompts : DEFAULT_PROMPTS)

  const dayEntries = (entriesResult.data ?? []) as TimeEntry[]
  const acts = await getActivities(supabase)
  const summary = summariseEntries(dayEntries, now, groupKey(acts))
  const groups = breakdown(
    summary.minutesByCategory,
    summariseEntries(dayEntries, now, activityKey(acts)).minutesByCategory,
    acts
  )
  const tasks = openTasks.data ?? []
  const pinnedLeft = tasks.filter(t => t.is_top3 && t.top3_date === today).length

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/today" className="text-muted active:text-ink-soft text-sm">
            ← Today
          </Link>
          <h1 className="text-2xl font-bold">Close the day</h1>
        </div>

        <section className="bg-card ring-1 ring-line rounded-xl px-4 py-4 mb-6 space-y-1.5 text-sm">
          <p className="text-ink-soft">
            {doneToday.count ?? 0} task{doneToday.count === 1 ? '' : 's'} done
            {pinnedLeft > 0 ? ` · ${pinnedLeft} of today's Top 3 still open` : ''}
          </p>
          {summary.focusSessions > 0 && (
            <p className="text-ink-soft">
              {formatMinutes(summary.focusMinutes)} focused across {summary.focusSessions} session
              {summary.focusSessions === 1 ? '' : 's'}
            </p>
          )}
          {groups.map(g => (
            <p key={g.id} className="text-muted">
              {g.name} {formatMinutes(g.minutes)}
              {g.parts.length > 0 && `: ${g.parts.map(p => `${p.name} ${formatMinutes(p.minutes)}`).join(', ')}`}
            </p>
          ))}
          {foodEntries.length > 0 && (
            <p className="text-ink-soft">
              {fuel.kcal.toLocaleString('en-GB')}
              {dayLog.kcal_target ? ` of ${dayLog.kcal_target.toLocaleString('en-GB')}` : ''} kcal ·{' '}
              {fuel.protein_g}
              {dayLog.protein_target ? ` of ${dayLog.protein_target}` : ''} g protein
            </p>
          )}
        </section>

        <section className="mb-6" aria-labelledby="got-done">
          <h2 id="got-done" className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            What did you get through today?
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-3">
            <DoneList items={doneLog.data ?? []} emptyHint="Worth a minute: list what you got through, however small." />
          </div>
        </section>

        <CloseoutForm
          prompts={prompts}
          savedAnswers={dayLog.closeout?.answers ?? []}
          tomorrowOptions={tasks
            // loose tasks, plus project tasks that are in Now
            .filter(t => t.project_id === null || t.band === 'now')
            .map(t => ({ id: t.id, title: t.title }))}
          savedTomorrowId={tomorrowLog.data?.one_thing_task_id ?? null}
        />
      </div>
    </div>
  )
}
