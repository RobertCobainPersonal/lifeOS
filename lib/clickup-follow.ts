import { addDays, londonDate } from '@/lib/dates'

/** The parts of a ClickUp API task that LifeOS reads. */
export interface ApiTask {
  id: string
  name?: string
  status?: { status?: string; type?: string }
  due_date?: string | null
  url?: string
  list?: { id?: string; name?: string }
  assignees?: { id: number; username?: string | null }[]
}

export interface MirrorRow {
  clickup_id: string
  title: string
  status: string | null
  due_date: string | null
  url: string
  list_id: string | null
  list_name: string | null
  mine: boolean
  assignees: string[]
  synced_at: string
}

/** A list or a single task you follow. */
export interface Follow {
  id: string
  kind: 'list' | 'task'
  clickup_id: string
  name: string
  path: string | null
  total_count: number | null
  closed_count: number | null
  overdue_count: number | null
  synced_at: string | null
}

const CUSTOM_ID = /^[A-Za-z][A-Za-z0-9]*-\d+$/
const TASK_ID = /^[a-z0-9]{6,12}$/

/** A task link, a bare task id, or a custom id such as MIS-123. */
export function parseTaskRef(input: string): { id: string; custom: boolean } | null {
  const s = input.trim()
  let candidate = s
  if (/^https?:\/\//i.test(s)) {
    const m = s.match(/^https?:\/\/app\.clickup\.com\/t\/(?:\d+\/)?([^/?#]+)/i)
    if (!m) return null
    candidate = m[1]
  }
  if (CUSTOM_ID.test(candidate)) return { id: candidate, custom: true }
  if (TASK_ID.test(candidate)) return { id: candidate, custom: false }
  return null
}

/** A list link (…/li/<id>) or a bare numeric list id. */
export function parseListRef(input: string): string | null {
  const s = input.trim()
  if (/^\d{6,}$/.test(s)) return s
  const m = s.match(/^https?:\/\/app\.clickup\.com\/.*\/li\/(\d+)/i)
  return m ? m[1] : null
}

export const isClosed = (t: ApiTask) => t.status?.type === 'closed' || t.status?.type === 'done'

const dueDay = (t: ApiTask) => (t.due_date ? londonDate(new Date(parseInt(t.due_date, 10))) : null)

export function mapTask(t: ApiTask, me: number, now: Date): MirrorRow {
  return {
    clickup_id: t.id,
    title: t.name ?? '',
    status: t.status?.status ?? null,
    due_date: dueDay(t),
    url: t.url ?? `https://app.clickup.com/t/${t.id}`,
    list_id: t.list?.id ?? null,
    list_name: t.list?.name ?? null,
    mine: (t.assignees ?? []).some(a => a.id === me),
    assignees: (t.assignees ?? []).map(a => a.username ?? '').filter(Boolean),
    synced_at: now.toISOString(),
  }
}

/** Progress of a followed list from all its tasks, closed included. */
export function listProgress(
  tasks: ApiTask[],
  today: string
): { total: number; closed: number; overdue: number; dueThisWeek: number } {
  const weekEnd = addDays(today, 6)
  let closed = 0
  let overdue = 0
  let dueThisWeek = 0
  for (const t of tasks) {
    if (isClosed(t)) {
      closed++
      continue
    }
    const due = dueDay(t)
    if (due && due < today) overdue++
    else if (due && due <= weekEnd) dueThisWeek++
  }
  return { total: tasks.length, closed, overdue, dueThisWeek }
}
