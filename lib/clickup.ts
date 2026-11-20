import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { londonToday } from '@/lib/dates'
import { isClosed, listProgress, mapTask, type ApiTask, type Follow, type MirrorRow } from '@/lib/clickup-follow'

const BASE = 'https://api.clickup.com/api/v2'
const MAX_PAGES = 10

function token(): string {
  const t = process.env.CLICKUP_API_TOKEN
  if (!t) throw new Error('CLICKUP_API_TOKEN not set')
  return t
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: token() }, cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`ClickUp ${res.status}: ${text.slice(0, 160)}`)
  }
  return res.json() as Promise<T>
}

async function me(): Promise<number> {
  return (await apiGet<{ user: { id: number } }>('/user')).user.id
}

async function teamIds(): Promise<string[]> {
  return ((await apiGet<{ teams?: { id: string }[] }>('/team')).teams ?? []).map(t => t.id)
}

/** Every task in a list, closed included (for progress), sub-tasks included. */
async function listTasks(listId: string): Promise<ApiTask[]> {
  const all: ApiTask[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await apiGet<{ tasks?: ApiTask[]; last_page?: boolean }>(
      `/list/${listId}/task?include_closed=true&subtasks=true&page=${page}`
    )
    const batch = res.tasks ?? []
    all.push(...batch)
    if (res.last_page || batch.length < 100) break
  }
  return all
}

export interface ListInfo {
  id: string
  name: string
  path: string
}

export async function getList(listId: string): Promise<ListInfo> {
  const l = await apiGet<{ id: string; name: string; folder?: { name?: string; hidden?: boolean }; space?: { name?: string } }>(
    `/list/${listId}`
  )
  const folder = l.folder && !l.folder.hidden && l.folder.name !== 'hidden' ? l.folder.name : null
  return { id: l.id, name: l.name, path: [l.space?.name, folder].filter(Boolean).join(' › ') }
}

export async function getTask(id: string, custom: boolean): Promise<ApiTask & { name: string }> {
  if (!custom) return apiGet(`/task/${id}`)
  for (const team of await teamIds()) {
    try {
      return await apiGet(`/task/${encodeURIComponent(id)}?custom_task_ids=true&team_id=${team}`)
    } catch {
      // try the next workspace
    }
  }
  throw new Error('ClickUp could not find that task')
}

export interface BrowseSpace {
  id: string
  name: string
  folders: { id: string; name: string; lists: { id: string; name: string }[] }[]
  lists: { id: string; name: string }[]
}

/** Spaces, their folders and lists, to pick from. */
export async function browse(): Promise<BrowseSpace[]> {
  const out: BrowseSpace[] = []
  for (const team of await teamIds()) {
    const { spaces = [] } = await apiGet<{ spaces?: { id: string; name: string }[] }>(`/team/${team}/space?archived=false`)
    const filled = await Promise.all(
      spaces.map(async s => {
        const [f, l] = await Promise.all([
          apiGet<{ folders?: { id: string; name: string; lists?: { id: string; name: string }[] }[] }>(
            `/space/${s.id}/folder?archived=false`
          ),
          apiGet<{ lists?: { id: string; name: string }[] }>(`/space/${s.id}/list?archived=false`),
        ])
        return {
          id: s.id,
          name: s.name,
          folders: (f.folders ?? []).map(x => ({
            id: x.id,
            name: x.name,
            lists: (x.lists ?? []).map(li => ({ id: li.id, name: li.name })),
          })),
          lists: (l.lists ?? []).map(li => ({ id: li.id, name: li.name })),
        }
      })
    )
    out.push(...filled)
  }
  return out
}

/**
 * Refresh what you follow. Open tasks are kept in the mirror; closed ones and
 * anything no longer followed are removed. A follow that fails to load keeps
 * its tasks as they were, so a ClickUp hiccup never empties the page.
 */
export async function syncFollows(supabase: SupabaseClient): Promise<{ errors: string[] }> {
  const { data, error } = await supabase.from('clickup_follows').select('*')
  if (error) throw new Error(error.message)
  const follows = (data ?? []) as Follow[]
  const now = new Date()
  const today = londonToday(now)
  const userId = await me()

  const keep = new Map<string, MirrorRow>()
  const keepLists = new Set<string>()
  const keepTasks = new Set<string>()
  const errors: string[] = []

  await Promise.all(
    follows.map(async f => {
      try {
        if (f.kind === 'list') {
          const tasks = await listTasks(f.clickup_id)
          for (const t of tasks) if (!isClosed(t)) keep.set(t.id, mapTask(t, userId, now))
          const p = listProgress(tasks, today)
          await supabase
            .from('clickup_follows')
            .update({ total_count: p.total, closed_count: p.closed, overdue_count: p.overdue, synced_at: now.toISOString() })
            .eq('id', f.id)
        } else {
          const t = await getTask(f.clickup_id, !/^[a-z0-9]+$/.test(f.clickup_id))
          if (!isClosed(t)) keep.set(t.id, mapTask(t, userId, now))
          await supabase
            .from('clickup_follows')
            .update({ name: t.name, closed_count: isClosed(t) ? 1 : 0, total_count: 1, synced_at: now.toISOString() })
            .eq('id', f.id)
        }
      } catch (e) {
        errors.push(`${f.name}: ${e instanceof Error ? e.message : 'failed'}`)
        if (f.kind === 'list') keepLists.add(f.clickup_id)
        else keepTasks.add(f.clickup_id)
      }
    })
  )

  const rows = [...keep.values()]
  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from('clickup_tasks').upsert(rows, { onConflict: 'clickup_id' })
    if (upsertError) throw new Error(upsertError.message)
  }

  // Remove everything else, except tasks of follows that failed to load this time
  const { data: existing } = await supabase.from('clickup_tasks').select('clickup_id, list_id')
  const stale = (existing ?? [])
    .filter(r => !keep.has(r.clickup_id) && !keepTasks.has(r.clickup_id) && !(r.list_id && keepLists.has(r.list_id)))
    .map(r => r.clickup_id)
  for (let i = 0; i < stale.length; i += 200) {
    const { error: delError } = await supabase.from('clickup_tasks').delete().in('clickup_id', stale.slice(i, i + 200))
    if (delError) throw new Error(delError.message)
  }

  return { errors }
}
