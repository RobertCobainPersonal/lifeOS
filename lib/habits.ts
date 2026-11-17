import { londonDate } from '@/lib/dates'

export const MAX_HABITS = 7

export interface Habit {
  id: string
  name: string
  created_at?: string | null
}

export function parseHabitName(
  raw: string,
  existing: string[]
): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().slice(0, 60)
  if (name === '') return { ok: false, error: 'Give it a name' }
  if (existing.some(e => e.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: 'That one is already on the list' }
  }
  if (existing.length >= MAX_HABITS) return { ok: false, error: `Keep it to ${MAX_HABITS}` }
  return { ok: true, name }
}

/** Days each non-negotiable was kept within a period, counting only days since it was added. */
export function habitWeek(
  habits: Habit[],
  ticks: { habit_id: string; day: string }[],
  days: string[]
): { id: string; name: string; kept: number; of: number }[] {
  return habits.map(h => {
    const since = h.created_at ? londonDate(new Date(h.created_at)) : ''
    const live = new Set(days.filter(d => d >= since))
    return {
      id: h.id,
      name: h.name,
      kept: new Set(ticks.filter(t => t.habit_id === h.id && live.has(t.day)).map(t => t.day)).size,
      of: live.size,
    }
  })
}
