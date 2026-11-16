import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { bandCounts, lastTouched, nextAction, touchedLabel, type Project, type ProjectTask } from '@/lib/projects'
import { PROJECT_TASK_COLUMNS } from '@/lib/projects-store'
import BottomNav from '@/components/BottomNav'
import NewProjectForm from '@/components/NewProjectForm'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const [projectsResult, tasksResult, inbox] = await Promise.all([
    supabase.from('projects').select('id, name, detail, is_focus, archived').eq('archived', false),
    supabase.from('tasks').select(PROJECT_TASK_COLUMNS).not('project_id', 'is', null),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])
  if (projectsResult.error) throw projectsResult.error

  const projects = ((projectsResult.data ?? []) as Project[]).sort(
    (a, b) => Number(b.is_focus) - Number(a.is_focus) || a.name.localeCompare(b.name)
  )
  const tasks = (tasksResult.data ?? []) as ProjectTask[]

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/more" className="text-muted active:text-ink-soft text-sm">
            ← More
          </Link>
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>

        {projects.length === 0 ? (
          <p className="text-faint text-sm mb-6 px-1">No projects yet.</p>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {projects.map(project => {
              const own = tasks.filter(t => t.project_id === project.id)
              const next = nextAction(own)
              const counts = bandCounts(own)
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-card ring-1 ring-line rounded-xl px-4 py-4 active:bg-sunk"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-ink font-semibold">{project.name}</h2>
                    {project.is_focus && (
                      <span className="text-xs text-accent-ink bg-accent-soft rounded px-1.5 py-0.5">
                        Focus
                      </span>
                    )}
                  </div>
                  <p className="text-ink-soft text-sm mt-1 leading-snug">
                    {next ? `Next: ${next.title}` : 'Nothing in Now'}
                  </p>
                  <p className="text-faint text-xs mt-2">
                    {counts.now} now · {counts.next} next · {counts.later} later ·{' '}
                    {touchedLabel(lastTouched(own), now)}
                  </p>
                </Link>
              )
            })}
          </div>
        )}

        <NewProjectForm />
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
