import { londonToday } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskCard from '@/components/TaskCard'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

type TaskRow = {
  id: string
  title: string
  domain: string | null
  energy: string | null
  due_date: string | null
  details: string | null
  status: string
  is_top3: boolean
  top3_date: string | null
}

export default async function TasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = londonToday()

  const [tasksResult, countResult, projectCount] = await Promise.all([
    // Project tasks live on their project page, not here
    supabase
      .from('tasks')
      .select('id, title, domain, energy, due_date, details, status, is_top3, top3_date')
      .eq('status', 'open')
      .is('project_id', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('captures')
      .select('*', { count: 'exact', head: true })
      .is('triaged_at', null),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .not('project_id', 'is', null),
  ])

  if (tasksResult.error) throw tasksResult.error

  const tasks: TaskRow[] = tasksResult.data ?? []
  const inboxCount = countResult.count ?? 0

  const top3Count = tasks.filter(t => t.is_top3 && t.top3_date === today).length

  const work = tasks.filter(t => t.domain === 'work')
  const personal = tasks.filter(t => t.domain === 'personal')
  const other = tasks.filter(t => !t.domain)

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tasks</h1>
          {top3Count > 0 && (
            <span className="text-xs text-muted">
              {top3Count}/3 in Top 3 today
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-faint text-base">No open tasks.</p>
            <p className="text-faint text-sm mt-1">
              Triage captures in the Inbox to create tasks.
            </p>
          </div>
        ) : (
          <>
            <TaskGroup label="Work" tasks={work} today={today} top3Count={top3Count} />
            <TaskGroup label="Personal" tasks={personal} today={today} top3Count={top3Count} />
            <TaskGroup label="Other" tasks={other} today={today} top3Count={top3Count} />
          </>
        )}

        {(projectCount.count ?? 0) > 0 && (
          <Link
            href="/projects"
            className="flex items-center justify-between bg-card ring-1 ring-line rounded-xl px-4 py-4 active:bg-sunk"
          >
            <span className="text-ink-soft text-sm">
              {projectCount.count} more in Projects
            </span>
            <span className="text-faint text-sm">→</span>
          </Link>
        )}
      </div>

      <BottomNav current="more" inboxCount={inboxCount} />
    </div>
  )
}

function TaskGroup({
  label,
  tasks,
  today,
  top3Count,
}: {
  label: string
  tasks: TaskRow[]
  today: string
  top3Count: number
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
        {label}
      </h2>
      <div className="bg-card ring-1 ring-line rounded-xl px-4">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            domain={task.domain as 'work' | 'personal' | null}
            energy={task.energy as 'deep' | 'admin' | null}
            dueDate={task.due_date}
            details={task.details}
            isTop3Today={task.is_top3 && task.top3_date === today}
            top3Count={top3Count}
          />
        ))}
      </div>
    </section>
  )
}
