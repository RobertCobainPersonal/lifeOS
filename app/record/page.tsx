import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonToday } from '@/lib/dates'
import {
  formatHour,
  formatMinutes,
  freeWindows,
  hotSpots,
  hourGrid,
  sentences,
  trainingSplit,
  weekSummary,
} from '@/lib/record'
import { ENTRY_COLUMNS } from '@/lib/time-store'
import { meetingMinutes, type CalendarEvent } from '@/lib/calendar'
import type { TimeEntry } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import Heatmap from '@/components/Heatmap'

const range = (from: string, length: number) =>
  Array.from({ length }, (_, i) => addDays(from, i))

function listHours(hours: number[]): string {
  const names = hours.map(formatHour)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

export default async function RecordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const today = londonToday(now)
  const from28 = addDays(today, -27)

  const [entriesResult, foodResult, logsResult, activitiesResult, inbox, calendarResult] = await Promise.all([
    supabase.from('time_entries').select(ENTRY_COLUMNS).gte('day', addDays(from28, -1)).lte('day', today),
    supabase.from('food_entries').select('day').gte('day', addDays(today, -13)).lte('day', today),
    supabase.from('day_log').select('day, closed_at').gte('day', addDays(today, -13)).lte('day', today),
    supabase.from('activities').select('day').gte('day', addDays(from28, -1)).lte('day', today),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
    supabase
      .from('calendar_events')
      .select('source, source_id, day, starts_at, ends_at, all_day, title, location, calendar')
      .gte('day', addDays(today, -6))
      .lte('day', today),
  ])

  const entries = (entriesResult.data ?? []) as TimeEntry[]
  const food = foodResult.data ?? []
  const logs = logsResult.data ?? []
  const activities = activitiesResult.data ?? []

  const thisWeek = range(addDays(today, -6), 7)
  const lastWeek = range(addDays(today, -13), 7)
  const last14 = range(addDays(today, -13), 14)
  const last28 = range(from28, 28)

  const current = weekSummary({ days: thisWeek, entries, food, logs, now })
  const calendarMinutes = meetingMinutes((calendarResult.data ?? []) as CalendarEvent[], thisWeek)
  const previous = weekSummary({ days: lastWeek, entries, food, logs, now })

  const recent = entries.filter(e => last14.includes(e.day))
  const grid = hourGrid(recent, now)
  const spots = hotSpots(grid)
  const windows = freeWindows(entries, last28, now)
  const split = trainingSplit({ entries, activities, days: last28, now })

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/more" className="text-muted active:text-ink-soft text-sm">
            ← More
          </Link>
          <h1 className="text-2xl font-bold">Record</h1>
        </div>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Last 7 days
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4 space-y-2">
            {sentences(current, previous).map(line => (
              <p key={line} className="text-ink-soft text-sm leading-relaxed">
                {line}
              </p>
            ))}
            {calendarMinutes > 0 && (
              <p className="text-ink-soft text-sm leading-relaxed">
                Your calendar had {formatMinutes(calendarMinutes)} of meetings.
              </p>
            )}
          </div>
        </section>

        {recent.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              Where time went · last 14 days
            </h2>
            <div className="bg-card/60 rounded-xl px-3 py-4">
              <Heatmap grid={grid} />
            </div>
            {spots.length > 0 && (
              <p className="text-muted text-sm mt-3 px-1">
                Procrastinating most often lands around {listHours(spots)}.
              </p>
            )}
          </section>
        ) : (
          <p className="text-faint text-sm px-1">More here once there are a few days of entries.</p>
        )}

        {windows.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              Usually free outside work
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
              <p className="text-ink-soft text-sm leading-relaxed">
                {listHours(windows.map(w => w.hour).sort((a, b) => a - b))} are usually untracked or rest.
              </p>
            </div>
          </section>
        )}

        {split && (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              Training and focus · last 28 days
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
              <p className="text-ink-soft text-sm leading-relaxed">
                On days after training you averaged {formatMinutes(split.afterTraining)} of focus; on
                days after rest, {formatMinutes(split.afterRest)}.
              </p>
              <p className="text-faint text-xs mt-2">
                Based on days with at least one focus session. A pattern, not a cause.
              </p>
            </div>
          </section>
        )}
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
