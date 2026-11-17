export type NewTask =
  | {
      ok: true
      title: string
      domain: 'work' | 'personal'
      energy: 'deep' | 'admin' | null
      due_date: string | null
    }
  | { ok: false; error: string }

function isRealDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const d = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day
}

/** Validate a task typed on Home or the Tasks page. */
export function parseNewTask(raw: {
  title: string
  domain: string
  energy: string
  dueDate: string
}): NewTask {
  const title = raw.title.trim().slice(0, 200)
  if (title === '') return { ok: false, error: 'Give the task a name' }
  if (raw.domain !== 'work' && raw.domain !== 'personal') return { ok: false, error: 'Choose Work or Personal' }
  if (raw.energy !== '' && raw.energy !== 'deep' && raw.energy !== 'admin') {
    return { ok: false, error: 'Choose Deep, Admin or neither' }
  }
  const due = raw.dueDate.trim()
  if (due !== '' && !isRealDay(due)) return { ok: false, error: 'That date is not valid' }
  return {
    ok: true,
    title,
    domain: raw.domain,
    energy: raw.energy === '' ? null : raw.energy,
    due_date: due === '' ? null : due,
  }
}
