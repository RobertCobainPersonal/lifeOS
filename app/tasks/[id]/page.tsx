import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TaskDetailView from '@/components/TaskDetailView'

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, domain, energy, due_date, details, status')
    .eq('id', id)
    .single()

  if (!task) notFound()
  if (task.status === 'done') redirect('/tasks')

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-12">
        <Link
          href="/tasks"
          className="text-gray-500 text-sm active:text-gray-300 transition-colors inline-block mb-6"
        >
          ← Tasks
        </Link>
        <TaskDetailView
          id={task.id}
          title={task.title}
          domain={task.domain as 'work' | 'personal' | null}
          energy={task.energy as 'deep' | 'admin' | null}
          dueDate={task.due_date}
          details={task.details}
        />
      </div>
    </div>
  )
}
