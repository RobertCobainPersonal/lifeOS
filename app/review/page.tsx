import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addDays, londonToday } from '@/lib/dates'
import { isOn } from '@/lib/features'
import { bandCounts, nextAction, type Project, type ProjectTask } from '@/lib/projects'
import { PROJECT_TASK_COLUMNS } from '@/lib/projects-store'
import { sentences, weekSummary } from '@/lib/record'
import { ENTRY_COLUMNS } from '@/lib/time-store'
import type { TimeEntry } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import CompleteReviewButton from '@/components/CompleteReviewButton'
import FocusProjectButton from '@/components/FocusProjectButton'

const range = (from: string, length: number) => Array.from({ length }, (_, i) => addDays(from, i))

export default async function ReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const today = londonToday(now)
  const since = addDays(today, -13)

  const [settings, entriesResult, foodResult, logsResult, projectsResult, tasksResult, looseOpen, inbox] =
    await Promise.all([
      supabase.from('settings').select('features, last_review_date').eq('id', 1).single(),
      supabase.from('time_entries').select(ENTRY_COLUMNS).gte('day', since).lte('day', today),
      supabase.from('food_entries').select('day').gte('day', since).lte('day', today),
      supabase.from('day_log').select('day, closed_at').gte('day', since).lte('day', today),
      supabase.from('projects').select('id, name, detail, is_focus, archived').eq('archived', false),
      supabase.from('tasks').select(PROJECT_TASK_COLUMNS).not('project_id', 'is', null),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .is('project_id', null),
      supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
    ])
  if (!isOn(settings.data?.features, 'weekly_review')) redirect('/settings')

  const entries = (entriesResult.data ?? []) as TimeEntry[]
  const food = foodResult.data ?? []
  const logs = logsResult.data ?? []
  const current = weekSummary({ days: range(addDays(today, -6), 7), entries, food, logs, now })
  const previous = weekSummary({ days: range(since, 7), entries, food, logs, now })

  const projects = ((projectsResult.data ?? []) as Project[]).sort((a, b) => a.name.localeCompare(b.name))
  const tasks = (tasksResult.data ?? []) as ProjectTask[]
  const inboxCount = inbox.count ?? 0

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/more" className="text-muted active:text-ink-soft text-sm">
            ← More
          </Link>
          <h1 className="text-2xl font-bold">Weekly review</h1>
        </div>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            1 · Last 7 days
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4 space-y-2">
            {sentences(current, previous).map(line => (
              <p key={line} className="text-ink-soft text-sm leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            2 · Clear the decks
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4">
            <Link href="/inbox" className="flex justify-between py-3 border-b border-line text-sm">
              <span className="text-ink-soft">Inbox</span>
              <span className="text-muted tabular-nums">{inboxCount} to sort →</span>
            </Link>
            <Link href="/tasks" className="flex justify-between py-3 text-sm">
              <span className="text-ink-soft">Tasks</span>
              <span className="text-muted tabular-nums">{looseOpen.count ?? 0} open →</span>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            3 · Projects and this week&rsquo;s focus
          </h2>
          {projects.length === 0 ? (
            <p className="text-faint text-sm px-1">No projects yet.</p>
          ) : (
            <div className="space-y-3">
              {projects.map(project => {
                const own = tasks.filter(t => t.project_id === project.id)
                const next = nextAction(own)
                const counts = bandCounts(own)
                return (
                  <div key={project.id} className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/projects/${project.id}`} className="text-ink font-semibold">
                        {project.name} →
                      </Link>
                      <FocusProjectButton projectId={project.id} isFocus={project.is_focus} />
                    </div>
                    <p className="text-ink-soft text-sm mt-2 leading-snug">
                      {next ? `Next: ${next.title}` : 'Nothing in Now. Move something up from Next?'}
                    </p>
                    <p className="text-faint text-xs mt-1">
                      {counts.now} now · {counts.next} next · {counts.later} later
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <CompleteReviewButton />
        {settings.data?.last_review_date && (
          <p className="text-faint text-xs text-center">
            Last review {settings.data.last_review_date}
          </p>
        )}
      </div>
      <BottomNav current="more" inboxCount={inboxCount} />
    </div>
  )
}
