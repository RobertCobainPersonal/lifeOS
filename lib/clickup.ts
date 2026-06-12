import 'server-only'

const BASE = 'https://api.clickup.com/api/v2'

async function apiGet(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: token },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`ClickUp API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export interface RawClickupTask {
  clickup_id: string
  title: string
  status: string | null
  due_date: string | null
  url: string
  list_name: string | null
  synced_at: string
}

export async function fetchClickUpTasks(): Promise<RawClickupTask[]> {
  const token = process.env.CLICKUP_API_TOKEN
  if (!token) throw new Error('CLICKUP_API_TOKEN not set')

  const [userRes, teamRes] = await Promise.all([
    apiGet('/user', token),
    apiGet('/team', token),
  ])

  const userId: number = userRes.user.id
  const teams: { id: string }[] = teamRes.teams ?? []
  const now = new Date().toISOString()
  const allTasks: RawClickupTask[] = []

  for (const team of teams) {
    for (let page = 0; page < 3; page++) {
      const res = await apiGet(
        `/team/${team.id}/task?assignees[]=${userId}&include_closed=false&subtasks=true&page=${page}`,
        token
      )
      const batch: {
        id: string
        name: string
        status?: { status?: string; type?: string }
        due_date?: string | null
        url?: string
        list?: { name?: string }
      }[] = res.tasks ?? []

      for (const t of batch) {
        // Skip done-type statuses that slipped through include_closed filter
        if (t.status?.type === 'closed') continue
        allTasks.push({
          clickup_id: t.id,
          title: t.name ?? '',
          status: t.status?.status ?? null,
          due_date: t.due_date ? new Date(parseInt(t.due_date)).toISOString().split('T')[0] : null,
          url: t.url ?? `https://app.clickup.com/t/${t.id}`,
          list_name: t.list?.name ?? null,
          synced_at: now,
        })
      }

      if (batch.length < 100) break
    }
  }

  return allTasks
}
