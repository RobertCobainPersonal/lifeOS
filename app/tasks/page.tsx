import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskCard from '@/components/TaskCard'
import BottomNav from '@/components/BottomNav'

type TaskRow = {
  id: string
  title: string
  domain: string | null
  energy: string | null
  due_date: string | null
  status: string
}

export default async function TasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [tasksResult, countResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, domain, energy, due_date, status')
      .eq('status', 'open')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('captures')
      .select('*', { count: 'exact', head: true })
      .is('triaged_at', null),
  ])

  if (tasksResult.error) throw tasksResult.error

  const tasks: TaskRow[] = tasksResult.data ?? []
  const inboxCount = countResult.count ?? 0

  const work = tasks.filter(t => t.domain === 'work')
  const personal = tasks.filter(t => t.domain === 'personal')
  const other = tasks.filter(t => !t.domain)

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-6">Tasks</h1>

        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-base">No open tasks.</p>
            <p className="text-gray-700 text-sm mt-1">
              Triage captures in the Inbox to create tasks.
            </p>
          </div>
        ) : (
          <>
            <TaskGroup label="Work" tasks={work} />
            <TaskGroup label="Personal" tasks={personal} />
            <TaskGroup label="Other" tasks={other} />
          </>
        )}
      </div>

      <BottomNav current="tasks" inboxCount={inboxCount} />
    </div>
  )
}

function TaskGroup({ label, tasks }: { label: string; tasks: TaskRow[] }) {
  if (tasks.length === 0) return null
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
        {label}
      </h2>
      <div className="bg-gray-900 rounded-xl px-4">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            domain={task.domain as 'work' | 'personal' | null}
            energy={task.energy as 'deep' | 'admin' | null}
            dueDate={task.due_date}
          />
        ))}
      </div>
    </section>
  )
}
