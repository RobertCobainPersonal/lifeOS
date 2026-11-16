export type OneThing =
  | { state: 'none' }
  | { state: 'open' | 'done'; kind: 'task' | 'clickup'; id: string; title: string }

interface LogRef {
  one_thing_task_id: string | null
  one_thing_clickup_id: string | null
}

/** Work out what Home should show for today's one thing. */
export function resolveOneThing(
  log: LogRef | null,
  tasks: { id: string; title: string; status: string }[],
  clickup: { clickup_id: string; title: string | null }[]
): OneThing {
  if (!log) return { state: 'none' }

  if (log.one_thing_task_id) {
    const t = tasks.find(x => x.id === log.one_thing_task_id)
    if (!t) return { state: 'none' }
    return {
      // Completed, parked or deferred: no longer today's live task
      state: t.status === 'open' ? 'open' : 'done',
      kind: 'task',
      id: t.id,
      title: t.title,
    }
  }

  if (log.one_thing_clickup_id) {
    const c = clickup.find(x => x.clickup_id === log.one_thing_clickup_id)
    if (!c) return { state: 'none' }
    return { state: 'open', kind: 'clickup', id: c.clickup_id, title: c.title ?? 'Work item' }
  }

  return { state: 'none' }
}
