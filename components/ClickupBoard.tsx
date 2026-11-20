'use client'

import { useState, useTransition } from 'react'
import { pinClickUpToTop3, unfollow, unpinClickUpFromTop3 } from '@/app/clickup/actions'

export interface BoardTask {
  clickup_id: string
  title: string
  status: string | null
  due_date: string | null
  url: string
  mine: boolean
  assignees: string[]
  pinned_top3_date: string | null
}

export interface BoardSection {
  followId: string
  kind: 'list' | 'task'
  name: string
  path: string | null
  total: number | null
  closed: number | null
  overdue: number | null
  tasks: BoardTask[]
}

const shortDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Followed lists (with progress) and single tasks, filterable to your own. */
export default function ClickupBoard({ sections, today }: { sections: BoardSection[]; today: string }) {
  const [onlyMine, setOnlyMine] = useState(false)
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function run(work: () => Promise<void>) {
    setError('')
    startTransition(async () => {
      try {
        await work()
      } catch (e) {
        setError(e instanceof Error && e.message.includes('Top 3') ? e.message : 'Could not save — try again')
      }
    })
  }

  const lists = sections.filter(s => s.kind === 'list')
  const singles = sections.filter(s => s.kind === 'task')
  const singleTasks = singles.flatMap(s => s.tasks.map(t => ({ ...t, followId: s.followId })))
  const filter = <T extends BoardTask>(tasks: T[]) => (onlyMine ? tasks.filter(t => t.mine) : tasks)

  function row(t: BoardTask, unfollowId?: string) {
    const overdue = t.due_date !== null && t.due_date < today
    const pinned = t.pinned_top3_date === today
    return (
      <li key={t.clickup_id} className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-ink text-sm leading-snug hover:underline">
            {t.title}
          </a>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
            {t.status && <span className="bg-sunk text-muted px-1.5 py-0.5 rounded">{t.status}</span>}
            {t.due_date && (
              <span className={overdue ? 'text-amber-700' : 'text-muted'}>
                {overdue ? 'overdue · ' : 'due '}
                {shortDate(t.due_date)}
              </span>
            )}
            {!t.mine && t.assignees.length > 0 && <span className="text-faint">{t.assignees.join(', ')}</span>}
            {!t.mine && t.assignees.length === 0 && <span className="text-faint">unassigned</span>}
          </div>
        </div>
        <button
          onClick={() => run(() => (pinned ? unpinClickUpFromTop3(t.clickup_id) : pinClickUpToTop3(t.clickup_id)))}
          disabled={isPending}
          aria-pressed={pinned}
          aria-label={pinned ? `Remove ${t.title} from Top 3` : `Add ${t.title} to Top 3`}
          className={`text-xs shrink-0 px-2 py-1 rounded-lg disabled:opacity-40 ${
            pinned ? 'bg-accent-soft text-accent-ink' : 'text-muted ring-1 ring-line active:bg-sunk'
          }`}
        >
          {pinned ? '★ Top 3' : '☆ Top 3'}
        </button>
        {unfollowId && (
          <button
            onClick={() => run(() => unfollow(unfollowId))}
            disabled={isPending}
            aria-label={`Stop following ${t.title}`}
            className="text-faint text-xs px-1 py-1 active:text-ink-soft"
          >
            ✕
          </button>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-ink-soft px-1">
        <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} className="w-4 h-4" />
        Only tasks assigned to me
      </label>

      {error && (
        <p role="alert" className="text-red-700 text-sm px-1">
          {error}
        </p>
      )}

      {lists.map(s => {
        const shown = filter(s.tasks)
        const open = !closedSections.has(s.followId)
        const total = s.total ?? 0
        const done = s.closed ?? 0
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        return (
          <section key={s.followId} className="bg-card ring-1 ring-line rounded-xl">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-start gap-2">
                <button
                  onClick={() =>
                    setClosedSections(prev => {
                      const next = new Set(prev)
                      if (next.has(s.followId)) next.delete(s.followId)
                      else next.add(s.followId)
                      return next
                    })
                  }
                  aria-expanded={open}
                  className="flex-1 min-w-0 text-left"
                >
                  <span className="block text-ink font-medium">{s.name}</span>
                  {s.path && <span className="block text-faint text-xs">{s.path}</span>}
                </button>
                <button
                  onClick={() => run(() => unfollow(s.followId))}
                  disabled={isPending}
                  className="text-faint text-xs px-1.5 py-1 active:text-ink-soft"
                >
                  Unfollow
                </button>
              </div>
              {total > 0 && (
                <>
                  <div className="h-1.5 bg-sunk rounded-full mt-2 overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-muted text-xs mt-1.5">
                    {done} of {total} done
                    {(s.overdue ?? 0) > 0 && <span className="text-amber-700"> · {s.overdue} overdue</span>}
                    {onlyMine && ` · ${shown.length} open for you`}
                  </p>
                </>
              )}
            </div>
            {open &&
              (shown.length === 0 ? (
                <p className="px-4 pb-3 text-faint text-sm">{onlyMine ? 'Nothing open for you.' : 'Nothing open.'}</p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">{shown.map(t => row(t))}</ul>
              ))}
          </section>
        )
      })}

      {singleTasks.length > 0 && (
        <section className="bg-card ring-1 ring-line rounded-xl">
          <h2 className="px-4 pt-3 pb-2 text-ink font-medium">Single tasks</h2>
          <ul className="divide-y divide-line border-t border-line">
            {filter(singleTasks).map(t => row(t, t.followId))}
          </ul>
        </section>
      )}
    </div>
  )
}
