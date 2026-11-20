import { londonToday } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ClickupRefreshButton from '@/components/ClickupRefreshButton'
import ClickupBoard, { type BoardSection, type BoardTask } from '@/components/ClickupBoard'
import ClickupFollowPicker from '@/components/ClickupFollowPicker'
import type { Follow } from '@/lib/clickup-follow'

export const dynamic = 'force-dynamic'

type MirrorTask = BoardTask & { list_id: string | null; synced_at: string | null }

export default async function ClickupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const hasToken = !!process.env.CLICKUP_API_TOKEN
  let syncErrors: string[] = []

  // Refresh what you follow on every visit
  if (hasToken) {
    try {
      const { syncFollows } = await import('@/lib/clickup')
      syncErrors = (await syncFollows(supabase)).errors
    } catch (e) {
      syncErrors = [e instanceof Error ? e.message : 'Sync failed']
    }
  }

  const [followsResult, tasksResult, inboxCountResult] = await Promise.all([
    supabase.from('clickup_follows').select('*').order('created_at'),
    supabase
      .from('clickup_tasks')
      .select('clickup_id, title, status, due_date, url, mine, assignees, pinned_top3_date, list_id, synced_at')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])

  const follows = (followsResult.data ?? []) as Follow[]
  const tasks = (tasksResult.data ?? []) as MirrorTask[]
  const today = londonToday()

  const sections: BoardSection[] = follows.map(f => ({
    followId: f.id,
    kind: f.kind,
    name: f.name,
    path: f.path,
    total: f.total_count,
    closed: f.closed_count,
    overdue: f.overdue_count,
    tasks: f.kind === 'list' ? tasks.filter(t => t.list_id === f.clickup_id) : tasks.filter(t => t.clickup_id === f.clickup_id),
  }))
  const lastSynced = follows.map(f => f.synced_at).filter(Boolean).sort().at(-1) ?? null

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold">Work (ClickUp)</h1>
            {hasToken && <ClickupRefreshButton />}
          </div>
          {lastSynced && <p className="text-faint text-xs">Synced {formatRelative(lastSynced)}</p>}
          {syncErrors.length > 0 && (
            <p className="text-amber-700 text-xs mt-1">Some items didn’t refresh — showing what was saved. {syncErrors.join(' · ')}</p>
          )}
        </div>

        {!hasToken ? (
          <div className="text-center py-16">
            <p className="text-faint text-base">ClickUp not configured.</p>
            <p className="text-faint text-sm mt-1">Set CLICKUP_API_TOKEN in your environment variables.</p>
          </div>
        ) : (
          <>
            {follows.length === 0 ? (
              <p className="text-muted text-sm px-1">
                Follow the lists that matter (a project, your admin list) and add single tasks by link. Only what you
                follow shows here and on Home.
              </p>
            ) : (
              <ClickupBoard sections={sections} today={today} />
            )}

            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
                {follows.length === 0 ? 'Get started' : 'Follow more'}
              </h2>
              <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
                <ClickupFollowPicker followedListIds={follows.filter(f => f.kind === 'list').map(f => f.clickup_id)} />
              </div>
            </section>
          </>
        )}
      </div>

      <BottomNav current="more" inboxCount={inboxCountResult.count ?? 0} />
    </div>
  )
}

function formatRelative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
