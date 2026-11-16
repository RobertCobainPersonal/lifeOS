import { londonDate } from '@/lib/dates'
import type { Activity, DailyHealth } from '@/lib/types'

export type HealthPayload =
  | { ok: true; health: DailyHealth | null; activities: Activity[] }
  | { ok: false; error: string }

/** A non-negative whole number from a number or numeric text; otherwise null. */
function wholeNumber(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'string' ? Number(value.trim()) : value
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max) return null
  return Math.round(n)
}

function isRealDay(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const d = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day
}

/** Validate the body the Health Shortcut posts. Only `day` is required. */
export function parseHealthPayload(body: unknown): HealthPayload {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Body must be a JSON object' }
  }
  const b = body as Record<string, unknown>
  if (!isRealDay(b.day)) return { ok: false, error: 'day must be a date as YYYY-MM-DD' }

  const sleep_minutes = wholeNumber(b.sleep_minutes, 1440)
  const resting_hr = wholeNumber(b.resting_hr, 250)
  const hrv = wholeNumber(b.hrv, 500)
  const health =
    sleep_minutes === null && resting_hr === null && hrv === null
      ? null
      : { day: b.day, sleep_minutes, resting_hr, hrv }

  // Shortcuts sends one item as an object rather than a list
  const rawWorkouts = Array.isArray(b.workouts)
    ? b.workouts
    : typeof b.workouts === 'object' && b.workouts !== null
    ? [b.workouts]
    : []

  const byId = new Map<string, Activity>()
  for (const raw of rawWorkouts) {
    if (typeof raw !== 'object' || raw === null) continue
    const w = raw as Record<string, unknown>
    if (typeof w.start !== 'string') continue
    const start = new Date(w.start)
    if (Number.isNaN(start.getTime())) continue

    const type = typeof w.type === 'string' && w.type.trim() !== '' ? w.type.trim().slice(0, 60) : null
    const started_at = start.toISOString()
    const source_id =
      typeof w.id === 'string' && w.id.trim() !== ''
        ? w.id.trim().slice(0, 200)
        : `${started_at}|${type ?? 'Workout'}`

    byId.set(source_id, {
      source: 'apple_health',
      source_id,
      started_at,
      day: londonDate(start),
      type,
      distance_m: wholeNumber(w.distance_m, 1_000_000),
      moving_seconds: wholeNumber(w.duration_seconds, 172_800),
      avg_hr: wholeNumber(w.avg_hr, 250),
      kcal: wholeNumber(w.kcal, 20_000),
    })
  }

  return { ok: true, health, activities: [...byId.values()] }
}

/** One line for Home, e.g. "Running 8.0 km yesterday". */
export function describeActivity(
  a: Pick<Activity, 'type' | 'day' | 'distance_m' | 'moving_seconds'>,
  today: string
): string {
  const daysAgo = Math.round(
    (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${a.day}T00:00:00Z`).getTime()) / 86_400_000
  )
  const when = daysAgo <= 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`
  const amount =
    a.distance_m && a.distance_m > 0
      ? `${(a.distance_m / 1000).toFixed(1)} km`
      : a.moving_seconds && a.moving_seconds > 0
      ? `${Math.round(a.moving_seconds / 60)} min`
      : null
  return [a.type ?? 'Workout', amount, when].filter(Boolean).join(' ')
}

/** Drop null fields so an upsert leaves stored values alone when a figure is missing. */
export function withoutNulls<T extends Record<string, unknown>>(row: T): Partial<T> {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null)) as Partial<T>
}
