import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ClickupRefreshButton from '@/components/ClickupRefreshButton'
import ClickupTaskList from '@/components/ClickupTaskList'

export const dynamic = 'force-dynamic'

export default async function ClickupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const hasToken = !!process.env.CLICKUP_API_TOKEN
  let syncError: string | null = null
  let justSyncedAt: string | null = null

  // Sync on every page load (page is force-dynamic)
  if (hasToken) {
    try {
      const { fetchClickUpTasks } = await import('@/lib/clickup')
      const tasks = await fetchClickUpTasks()
      if (tasks.length > 0) {
        const { error } = await supabase
          .from('clickup_tasks')
          .upsert(tasks, { onConflict: 'clickup_id' })
        if (error) throw new Error(error.message)
      }
      justSyncedAt = new Date().toISOString()
    } catch (e) {
      syncError = e instanceof Error ? e.message : 'Sync failed'
    }
  }

  const [tasksResult, inboxCountResult] = await Promise.all([
    supabase
      .from('clickup_tasks')
      .select('clickup_id, title, status, due_date, url, list_name, pinned_top3_date, synced_at')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])

  const tasks = tasksResult.data ?? []
  const inboxCount = inboxCountResult.count ?? 0

  const today = new Date().toISOString().split('T')[0]

  // Last sync time: from fresh sync or from cache
  const lastSyncedAt =
    justSyncedAt ?? tasks[0]?.synced_at ?? null

  const lastSyncedText = lastSyncedAt
    ? `Synced ${formatRelative(lastSyncedAt)}`
    : null

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Work (ClickUp)</h1>
          <ClickupRefreshButton />
        </div>

        {lastSyncedText && (
          <p className="text-gray-600 text-xs mb-1">{lastSyncedText}</p>
        )}

        {syncError && (
          <p className="text-amber-500 text-xs mb-4">
            Sync error — showing cached data. {syncError}
          </p>
        )}

        {!hasToken ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-base">ClickUp not configured.</p>
            <p className="text-gray-700 text-sm mt-1">
              Set CLICKUP_API_TOKEN in your environment variables.
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-base">No open ClickUp tasks assigned to you.</p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">
              {tasks.length} open task{tasks.length !== 1 ? 's' : ''}
            </p>

            <ClickupTaskList groups={groupByList(tasks)} today={today} />
          </>
        )}
      </div>

      <BottomNav current="tasks" inboxCount={inboxCount} />
    </div>
  )
}

type Task = {
  clickup_id: string
  title: string
  status: string | null
  due_date: string | null
  url: string
  list_name: string | null
  pinned_top3_date: string | null
  synced_at: string | null
}


function groupByList(tasks: Task[]) {
  const map = new Map<string, Task[]>()
  for (const task of tasks) {
    const key = task.list_name ?? 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(task)
  }
  return Array.from(map.entries()).map(([listName, items]) => ({ listName, items }))
}

function formatRelative(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
