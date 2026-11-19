import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonToday } from '@/lib/dates'
import { asText, dayHeading, groupByDay, type DoneEntry } from '@/lib/done'
import DoneList from '@/components/DoneList'
import FillInDay from '@/components/FillInDay'
import CopyText from '@/components/CopyText'
import BottomNav from '@/components/BottomNav'

const SHOWN_DAYS = 90

export default async function DonePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = londonToday(new Date())
  const earliest = addDays(today, -30)
  const [{ data, error }, inbox] = await Promise.all([
    supabase
      .from('done_entries')
      .select('id, day, text, created_at')
      .gte('day', addDays(today, -SHOWN_DAYS))
      .order('created_at'),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])
  if (error) throw new Error(error.message)

  const groups = groupByDay((data ?? []) as DoneEntry[])
  const weekStart = addDays(today, -6)
  const lastWeek = groups.filter(g => g.day >= weekStart)
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/more" className="text-muted active:text-ink-soft text-sm">
            ← More
          </Link>
          <h1 className="text-2xl font-bold">What I got done</h1>
        </div>

        <p className="text-muted text-sm px-1">
          {total === 0
            ? 'A running record of what you deliver. Add from Home, the day close, or the Done Shortcut on your phone.'
            : `${total} thing${total === 1 ? '' : 's'} in the last ${SHOWN_DAYS} days.`}
        </p>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">Fill in a day</h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
            <FillInDay today={today} earliest={earliest} />
          </div>
        </section>

        {groups.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">By day</h2>
              <div className="flex">
                {lastWeek.length > 0 && <CopyText text={asText(lastWeek)} label="Copy last 7 days" />}
                <CopyText text={asText(groups)} label="Copy all" />
              </div>
            </div>
            <div className="space-y-3">
              {groups.map(g => (
                <div key={g.day} className="bg-card ring-1 ring-line rounded-xl px-4 py-3">
                  <h3 className="text-sm font-medium text-ink mb-1">
                    {g.day === today ? 'Today' : dayHeading(g.day)}
                  </h3>
                  {g.day >= earliest ? (
                    <DoneList items={g.items} day={g.day} />
                  ) : (
                    <ul>
                      {g.items.map(i => (
                        <li key={i.id} className="text-sm text-ink-soft py-1">
                          ✓ {i.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
