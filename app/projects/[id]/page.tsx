import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { londonToday } from '@/lib/dates'
import { BANDS, BAND_LABEL, lastTouched, openInBand, touchedLabel, type Project, type ProjectTask } from '@/lib/projects'
import { PROJECT_TASK_COLUMNS } from '@/lib/projects-store'
import BottomNav from '@/components/BottomNav'
import AddProjectTask from '@/components/AddProjectTask'
import FocusProjectButton from '@/components/FocusProjectButton'
import ProjectTaskRow from '@/components/ProjectTaskRow'

type Row = ProjectTask & { is_top3: boolean; top3_date: string | null }

const BAND_NOTE = {
  now: 'Live tasks. The first one is offered in your morning plan.',
  next: 'Queued. Move one to Now when there is room.',
  later: 'Parked. Never shown anywhere else.',
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const today = londonToday(now)
  const [projectResult, tasksResult, inbox, localTop3, workTop3] = await Promise.all([
    supabase.from('projects').select('id, name, detail, is_focus, archived').eq('id', id).maybeSingle(),
    supabase.from('tasks').select(PROJECT_TASK_COLUMNS).eq('project_id', id),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_top3', true)
      .eq('top3_date', today)
      .eq('status', 'open'),
    supabase
      .from('clickup_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('pinned_top3_date', today),
  ])
  if (!projectResult.data) notFound()

  const project = projectResult.data as Project
  const tasks = (tasksResult.data ?? []) as Row[]
  const top3Full = (localTop3.count ?? 0) + (workTop3.count ?? 0) >= 3
  const doneCount = tasks.filter(t => t.status === 'done').length

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <Link href="/projects" className="text-gray-500 active:text-gray-300 text-sm">
          ← Projects
        </Link>
        <div className="flex items-start justify-between gap-3 mt-2 mb-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <FocusProjectButton projectId={project.id} isFocus={project.is_focus} />
        </div>
        <p className="text-gray-600 text-xs mb-1">
          {touchedLabel(lastTouched(tasks), now)}
          {doneCount > 0 ? ` · ${doneCount} done` : ''}
        </p>
        {project.detail && <p className="text-gray-500 text-sm mb-6 break-words">{project.detail}</p>}

        <div className="space-y-6 mt-6">
          {BANDS.map(band => {
            const rows = openInBand(tasks, band) as Row[]
            return (
              <section key={band}>
                <div className="flex items-baseline justify-between mb-1 px-1">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {BAND_LABEL[band]}
                  </h2>
                  <span className="text-xs text-gray-600">{rows.length}</span>
                </div>
                <p className="text-gray-600 text-xs mb-2 px-1">{BAND_NOTE[band]}</p>
                {rows.length === 0 ? (
                  <p className="text-gray-700 text-sm px-1">Empty.</p>
                ) : (
                  <div className="bg-gray-900 rounded-xl px-4">
                    {rows.map(t => (
                      <ProjectTaskRow
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        band={band}
                        isTop3Today={t.is_top3 && t.top3_date === today}
                        top3Full={top3Full}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          <AddProjectTask projectId={project.id} />
        </div>
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
