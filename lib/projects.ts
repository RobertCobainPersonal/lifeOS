export type Band = 'now' | 'next' | 'later'
export const BANDS: Band[] = ['now', 'next', 'later']
export const BAND_LABEL: Record<Band, string> = { now: 'Now', next: 'Next', later: 'Later' }

export interface Project {
  id: string
  name: string
  detail: string | null
  is_focus: boolean
  archived: boolean
}

export interface ProjectTask {
  id: string
  title: string
  status: string
  project_id: string | null
  band: Band | null
  project_sort: number | null
  last_touched_at: string
  completed_at: string | null
  created_at: string
}

/** A task that belongs to no project. Only these appear in Tasks, Slipping and the admin batch. */
export function isLoose(task: { project_id: string | null }): boolean {
  return task.project_id === null
}

function byListOrder(a: ProjectTask, b: ProjectTask): number {
  const sa = a.project_sort ?? Number.MAX_SAFE_INTEGER
  const sb = b.project_sort ?? Number.MAX_SAFE_INTEGER
  return sa - sb || a.created_at.localeCompare(b.created_at)
}

export function openInBand(tasks: ProjectTask[], band: Band): ProjectTask[] {
  return tasks.filter(t => t.status === 'open' && t.band === band).sort(byListOrder)
}

/** The one task a project puts forward: its first open Now item. */
export function nextAction(tasks: ProjectTask[]): ProjectTask | null {
  return openInBand(tasks, 'now')[0] ?? null
}

export function bandCounts(tasks: ProjectTask[]): Record<Band, number> {
  return {
    now: openInBand(tasks, 'now').length,
    next: openInBand(tasks, 'next').length,
    later: openInBand(tasks, 'later').length,
  }
}

/** Most recent touch or completion across a project's tasks; null when it has none. */
export function lastTouched(tasks: ProjectTask[]): string | null {
  let latest: string | null = null
  for (const t of tasks) {
    for (const stamp of [t.last_touched_at, t.completed_at]) {
      if (stamp && (latest === null || new Date(stamp) > new Date(latest))) latest = stamp
    }
  }
  return latest
}

/** What the morning plan offers: one next action per live project, focus project first. */
export function planCandidates(
  projects: Pick<Project, 'id' | 'name' | 'is_focus' | 'archived'>[],
  tasks: ProjectTask[]
): { projectId: string; projectName: string; task: ProjectTask }[] {
  return projects
    .filter(p => !p.archived)
    .sort((a, b) => Number(b.is_focus) - Number(a.is_focus) || a.name.localeCompare(b.name))
    .flatMap(p => {
      const task = nextAction(tasks.filter(t => t.project_id === p.id))
      return task ? [{ projectId: p.id, projectName: p.name, task }] : []
    })
}

export function parseProjectTask(raw: {
  title: string
  band: string
}): { ok: true; title: string; band: Band } | { ok: false; error: string } {
  const title = raw.title.trim().slice(0, 200)
  if (title === '') return { ok: false, error: 'Give the task a name' }
  if (!BANDS.includes(raw.band as Band)) return { ok: false, error: 'Choose Now, Next or Later' }
  return { ok: true, title, band: raw.band as Band }
}

/** "today", "yesterday", "5 days ago" or a date, for a quiet last-touched line. */
export function touchedLabel(iso: string | null, now: Date): string {
  if (!iso) return 'Not started'
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Touched today'
  if (days === 1) return 'Touched yesterday'
  if (days < 14) return `Touched ${days} days ago`
  return `Touched ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' }).format(new Date(iso))}`
}
