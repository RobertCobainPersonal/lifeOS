import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonDayStartIso, londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'
import { DEFAULT_PROMPTS, summariseEntries } from '@/lib/closeout'
import { CATEGORIES } from '@/lib/time'
import { ENTRY_COLUMNS } from '@/lib/time-store'
import type { Category, TimeEntry } from '@/lib/types'
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

  const [dayLog, settings, entriesResult, openTasks, doneToday, tomorrowLog] = await Promise.all([
    getOrCreateDayLog(supabase, today),
    supabase.from('settings').select('journal_prompts').eq('id', 1).single(),
    supabase.from('time_entries').select(ENTRY_COLUMNS).eq('day', today),
    supabase
      .from('tasks')
      .select('id, title, is_top3, top3_date')
      .eq('status', 'open')
      .order('created_at'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', londonDayStartIso(today)),
    supabase.from('day_log').select('one_thing_task_id').eq('day', tomorrow).maybeSingle(),
  ])

  // A day that is already closed keeps the prompts it was answered against
  const prompts: string[] =
    dayLog.closeout?.prompts ??
    (Array.isArray(settings.data?.journal_prompts) ? settings.data.journal_prompts : DEFAULT_PROMPTS)

  const summary = summariseEntries((entriesResult.data ?? []) as TimeEntry[], now)
  const categories = (Object.entries(summary.minutesByCategory) as [Category, number][]).sort(
    (a, b) => b[1] - a[1]
  )
  const tasks = openTasks.data ?? []
  const pinnedLeft = tasks.filter(t => t.is_top3 && t.top3_date === today).length

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/today" className="text-gray-500 active:text-gray-300 text-sm">
            ← Today
          </Link>
          <h1 className="text-2xl font-bold">Close the day</h1>
        </div>

        <section className="bg-gray-900 rounded-xl px-4 py-4 mb-6 space-y-1.5 text-sm">
          <p className="text-gray-300">
            {doneToday.count ?? 0} task{doneToday.count === 1 ? '' : 's'} done
            {pinnedLeft > 0 ? ` · ${pinnedLeft} of today's Top 3 still open` : ''}
          </p>
          {summary.focusSessions > 0 && (
            <p className="text-gray-300">
              {formatMinutes(summary.focusMinutes)} focused across {summary.focusSessions} session
              {summary.focusSessions === 1 ? '' : 's'}
            </p>
          )}
          {categories.length > 0 && (
            <p className="text-gray-500">
              {categories.map(([c, m]) => `${CATEGORIES[c].label} ${formatMinutes(m)}`).join(' · ')}
            </p>
          )}
        </section>

        <CloseoutForm
          prompts={prompts}
          savedAnswers={dayLog.closeout?.answers ?? []}
          tomorrowOptions={tasks.map(t => ({ id: t.id, title: t.title }))}
          savedTomorrowId={tomorrowLog.data?.one_thing_task_id ?? null}
        />
      </div>
    </div>
  )
}
