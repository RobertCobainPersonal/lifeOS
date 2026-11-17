import { STOP_CHOICE } from '@/lib/activities'
import { londonDate, londonHour } from '@/lib/dates'
import type { Category, TimeEntry } from '@/lib/types'

export const CATEGORIES: Record<Category, { label: string }> = {
  deep_work: { label: 'Deep Work' },
  meetings: { label: 'Meetings' },
  admin: { label: 'Admin / Email' },
  reactive: { label: 'Reactive Work' },
  procrastinating: { label: 'Procrastinating' },
  personal_project: { label: 'Personal Project' },
  learning: { label: 'Learning' },
  rest: { label: 'Rest / Recovery' },
  exercise: { label: 'Exercise' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[]

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && value in CATEGORIES
}

/** An entry left running is counted for at most four hours. */
export const MAX_ENTRY_SECONDS = 14400

type Timing = Pick<TimeEntry, 'started_at' | 'ended_at' | 'paused_at' | 'paused_seconds'>

/** Seconds actually spent, from timestamps: survives reloads and a locked phone. */
export function elapsedSeconds(e: Timing, now: Date): number {
  const start = new Date(e.started_at).getTime()
  const end = e.ended_at
    ? new Date(e.ended_at).getTime()
    : e.paused_at
    ? new Date(e.paused_at).getTime()
    : now.getTime()
  const seconds = Math.floor((end - start) / 1000) - e.paused_seconds
  return Math.min(MAX_ENTRY_SECONDS, Math.max(0, seconds))
}

export function remainingSeconds(
  e: Timing & Pick<TimeEntry, 'planned_minutes'>,
  now: Date
): number {
  return Math.max(0, (e.planned_minutes ?? 0) * 60 - elapsedSeconds(e, now))
}

/**
 * Spread an entry's time across London clock hours. Pauses are not located in
 * time, so the counted seconds are laid out from the start.
 */
export function splitByHour(
  e: Timing,
  now: Date
): { day: string; hour: number; seconds: number }[] {
  const parts: { day: string; hour: number; seconds: number }[] = []
  let cursor = new Date(e.started_at).getTime()
  const end = cursor + elapsedSeconds(e, now) * 1000
  while (cursor < end) {
    // London's offset is a whole number of hours, so UTC hour boundaries are London's too
    const nextHour = Math.floor(cursor / 3_600_000) * 3_600_000 + 3_600_000
    const sliceEnd = Math.min(nextHour, end)
    const seconds = Math.round((sliceEnd - cursor) / 1000)
    if (seconds > 0) {
      const at = new Date(cursor)
      parts.push({ day: londonDate(at), hour: londonHour(at), seconds })
    }
    cursor = sliceEnd
  }
  return parts
}

/** 25:05 under an hour, 1:02:05 beyond. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

export { STOP_CHOICE }

/** `activity` is whatever names it: an id, "Group / Part", a name, or an older category key. */
export type TrackRequest =
  | { ok: true; action: 'start'; activity: string; label: string | null; energy: number | null }
  | { ok: true; action: 'stop' }
  | {
      ok: true
      action: 'log'
      activity: string
      minutes: number
      label: string | null
      energy: number | null
    }
  | { ok: false; error: string }

function cleanLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, 120)
  return trimmed === '' ? null : trimmed
}

export function cleanEnergy(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null
}

/** Validate the body of POST /api/track (phone Shortcuts). */
export function parseTrackBody(body: unknown): TrackRequest {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Body must be a JSON object' }
  }
  const b = body as Record<string, unknown>

  if (b.action === 'stop') return { ok: true, action: 'stop' }

  if (b.action === 'pick') {
    const choice = typeof b.choice === 'string' ? b.choice.trim() : ''
    if (choice === STOP_CHOICE) return { ok: true, action: 'stop' }
    if (choice === '') return { ok: false, error: 'choice is missing' }
    return { ok: true, action: 'start', activity: choice, label: null, energy: null }
  }

  if (b.action !== 'start' && b.action !== 'log') {
    return { ok: false, error: 'action must be start, stop, pick or log' }
  }
  const ref = typeof b.activity === 'string' ? b.activity.trim() : typeof b.category === 'string' ? b.category.trim() : ''
  if (ref === '') return { ok: false, error: 'activity is missing' }
  const label = cleanLabel(b.label)
  const energy = cleanEnergy(b.energy)

  if (b.action === 'start') {
    return { ok: true, action: 'start', activity: ref, label, energy }
  }

  const minutes = typeof b.minutes === 'string' ? Number(b.minutes) : b.minutes
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
    return { ok: false, error: 'minutes must be between 1 and 240' }
  }
  return {
    ok: true,
    action: 'log',
    activity: ref,
    minutes: Math.round(minutes),
    label,
    energy,
  }
}

/** Column changes for pausing or resuming an entry. */
export function pauseFields(
  e: Timing,
  now: Date
): { paused_at: string | null; paused_seconds: number } {
  if (!e.paused_at) return { paused_at: now.toISOString(), paused_seconds: e.paused_seconds }
  const paused = Math.max(0, Math.floor((now.getTime() - new Date(e.paused_at).getTime()) / 1000))
  return { paused_at: null, paused_seconds: e.paused_seconds + paused }
}

/**
 * Column changes for ending an entry. An open pause is banked, and an entry
 * left running past the cap is ended at the cap so its stored span is honest.
 */
export function endFields(
  e: Timing,
  now: Date
): { ended_at: string; paused_at: null; paused_seconds: number } {
  const start = new Date(e.started_at).getTime()
  const paused_seconds = e.paused_at ? pauseFields(e, now).paused_seconds : e.paused_seconds
  const latest = start + (MAX_ENTRY_SECONDS + paused_seconds) * 1000
  const ended = Math.max(start, Math.min(now.getTime(), latest))
  return { ended_at: new Date(ended).toISOString(), paused_at: null, paused_seconds }
}

/** Link that opens the focus form for a task or work item. */
export function focusHref(kind: 'task' | 'clickup', id: string): string {
  return `/time?${kind === 'task' ? 'task' : 'clickup'}=${encodeURIComponent(id)}`
}

/** A focus session whose countdown has finished but which was never ended. */
export function isOverrun(
  e: Timing & Pick<TimeEntry, 'mode' | 'planned_minutes'>,
  now: Date
): boolean {
  return e.mode === 'focus' && remainingSeconds(e, now) === 0
}
