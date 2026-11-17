import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonDayStartIso, londonToday } from '@/lib/dates'
import { formatGap, freeGaps, londonClock, type CalendarEvent } from '@/lib/calendar'
import { isOn } from '@/lib/features'
import BottomNav from '@/components/BottomNav'
import RemoveEventButton from '@/components/RemoveEventButton'

export default async function WeekPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const today = londonToday(now)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))

  const [settings, eventsResult, inbox] = await Promise.all([
    supabase.from('settings').select('features').eq('id', 1).single(),
    supabase
      .from('calendar_events')
      .select('source, source_id, day, starts_at, ends_at, all_day, title, location, calendar')
      .gte('day', today)
      .lte('day', days[6])
      .order('starts_at'),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])
  if (!isOn(settings.data?.features, 'week_ahead')) redirect('/settings')

  const events = (eventsResult.data ?? []) as CalendarEvent[]
  const dayLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/more" className="text-muted active:text-ink-soft text-sm">
            ← More
          </Link>
          <h1 className="text-2xl font-bold">Week ahead</h1>
        </div>

        {events.length === 0 && (
          <p className="text-muted text-sm px-1">
            No meetings received for the next seven days. The Calendar Shortcut needs to send a week,
            not just today.
          </p>
        )}

        {days.map(day => {
          const own = events.filter(e => e.day === day)
          // For today, free time counts from now; for later days, from the start of the day
          const from = day === today ? now : new Date(londonDayStartIso(day))
          const gaps = freeGaps(own, day, from)
          return (
            <section key={day}>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
                {day === today ? 'Today · ' : ''}
                {dayLabel.format(new Date(`${day}T00:00:00Z`))}
              </h2>
              <div className="bg-card ring-1 ring-line rounded-xl px-4 py-1">
                {own.length === 0 ? (
                  <p className="text-faint text-sm py-2.5">Nothing in the calendar.</p>
                ) : (
                  own.map(e => (
                    <div
                      key={e.source_id}
                      className="flex gap-3 py-2.5 border-b border-line last:border-0 text-sm"
                    >
                      <span className="shrink-0 w-24 text-muted tabular-nums">
                        {e.all_day ? 'All day' : `${londonClock(e.starts_at)}–${londonClock(e.ends_at)}`}
                      </span>
                      <span className="flex-1 text-ink leading-snug">
                        {e.title}
                        {e.location ? <span className="text-muted"> · {e.location}</span> : null}
                      </span>
                      {e.source === 'manual' && <RemoveEventButton sourceId={e.source_id} title={e.title} />}
                    </div>
                  ))
                )}
              </div>
              {own.length > 0 && gaps.length > 0 && (
                <p className="text-muted text-sm mt-2 px-1">
                  Free {gaps.slice(0, 3).map(formatGap).join(' · ')}
                </p>
              )}
            </section>
          )
        })}
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
