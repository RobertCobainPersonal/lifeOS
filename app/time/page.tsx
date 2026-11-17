import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getActivities, getOpenEntry } from '@/lib/time-store'
import { labelOf, resolveEntry, shortcutMenu } from '@/lib/activities'
import BottomNav from '@/components/BottomNav'
import ActivityPicker from '@/components/ActivityPicker'
import FocusStartForm from '@/components/FocusStartForm'
import FocusTimer from '@/components/FocusTimer'
import TrackRunning from '@/components/TrackRunning'

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const taskId = typeof params.task === 'string' ? params.task : null
  const clickupId = typeof params.clickup === 'string' ? params.clickup : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const now = new Date()
  const [open, activities, inbox, focusTask, focusWork] = await Promise.all([
    getOpenEntry(supabase),
    getActivities(supabase),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
    taskId
      ? supabase.from('tasks').select('id, title').eq('id', taskId).eq('status', 'open').maybeSingle()
      : Promise.resolve({ data: null }),
    clickupId
      ? supabase.from('clickup_tasks').select('clickup_id, title').eq('clickup_id', clickupId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const running = open ? resolveEntry(open, activities) : null

  const focusTarget = focusTask.data
    ? { label: focusTask.data.title as string, taskId: focusTask.data.id as string }
    : focusWork.data
    ? {
        label: (focusWork.data.title as string | null) ?? 'Work item',
        clickupId: focusWork.data.clickup_id as string,
      }
    : null

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/today" className="text-muted active:text-ink-soft text-sm">
            ← Today
          </Link>
          <h1 className="text-2xl font-bold">{open?.mode === 'focus' ? 'Focus' : 'Time'}</h1>
        </div>

        {open?.mode === 'focus' ? (
          <FocusTimer key={open.id} entry={open} serverNowMs={now.getTime()} />
        ) : (
          <div className="space-y-6">
            {focusTarget && <FocusStartForm {...focusTarget} />}

            {open && <TrackRunning entry={open} name={labelOf(running?.id ?? null, activities)} serverNowMs={now.getTime()} />}

            {!focusTarget && (
              <div>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  {open ? 'Switch to' : 'What are you doing?'}
                </h2>
                <ActivityPicker
                  groups={shortcutMenu(activities)}
                  currentId={running?.id ?? null}
                  currentGroup={running?.group ?? null}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
