import { addDays, londonDate, londonDayStartIso, londonHour } from '@/lib/dates'

export interface CalendarEvent {
  source: string
  source_id: string
  day: string
  starts_at: string
  ends_at: string
  all_day: boolean
  title: string
  location: string | null
  calendar: string | null
}

export type CalendarPayload =
  | { ok: true; from: string; to: string; events: CalendarEvent[] }
  | { ok: false; error: string }

/** The working day free time is looked for in, and the shortest gap worth offering. */
export const WORK_DAY = { start: 8, end: 18 }
export const MIN_GAP_MINUTES = 25
const MAX_RANGE_DAYS = 14
const MAX_EVENT_DAYS = 31

function isRealDay(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const d = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, max)
  return trimmed === '' ? null : trimmed
}

function truthy(value: unknown): boolean {
  if (value === true || value === 1) return true
  return typeof value === 'string' && ['true', 'yes', '1'].includes(value.trim().toLowerCase())
}

/**
 * Validate what the calendar Shortcut posts. The events replace everything
 * stored for the days from `from` to `to`, so a cancelled meeting disappears.
 */
export function parseCalendarPayload(body: unknown): CalendarPayload {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Body must be a JSON object' }
  }
  const b = body as Record<string, unknown>
  if (!isRealDay(b.from)) return { ok: false, error: 'from must be a date as YYYY-MM-DD' }
  const to = b.to === undefined || b.to === null || b.to === '' ? b.from : b.to
  if (!isRealDay(to)) return { ok: false, error: 'to must be a date as YYYY-MM-DD' }
  if (to < b.from) return { ok: false, error: 'to must not be before from' }
  if (to > addDays(b.from, MAX_RANGE_DAYS - 1)) {
    return { ok: false, error: `Send at most ${MAX_RANGE_DAYS} days at a time` }
  }

  // Shortcuts sends one item as an object rather than a list
  const raw = Array.isArray(b.events)
    ? b.events
    : typeof b.events === 'object' && b.events !== null
    ? [b.events]
    : []

  const byId = new Map<string, CalendarEvent>()
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const e = item as Record<string, unknown>
    const title = text(e.title, 200)
    if (!title || typeof e.start !== 'string') continue
    const start = new Date(e.start)
    if (Number.isNaN(start.getTime())) continue

    const endRaw = typeof e.end === 'string' ? new Date(e.end) : null
    const end = endRaw && !Number.isNaN(endRaw.getTime()) && endRaw > start ? endRaw : start
    const allDay = truthy(e.all_day)
    const baseId = text(e.id, 200) ?? `${start.toISOString()}|${title}`

    // One row per London day the event touches, each clipped to that day,
    // so an overnight or multi-day event shows on every day it covers.
    const firstDay = londonDate(start)
    const lastDay = londonDate(end > start ? new Date(end.getTime() - 1) : start)
    const days: string[] = []
    for (let d = firstDay; d <= lastDay && days.length < MAX_EVENT_DAYS; d = addDays(d, 1)) days.push(d)

    for (const day of days) {
      if (day < b.from || day > to) continue
      const dayStart = new Date(londonDayStartIso(day)).getTime()
      const dayEnd = new Date(londonDayStartIso(addDays(day, 1))).getTime()
      const segStart = Math.max(start.getTime(), dayStart)
      const segEnd = Math.max(segStart, Math.min(end.getTime(), dayEnd))
      const source_id = days.length > 1 ? `${baseId}|${day}` : baseId
      byId.set(source_id, {
        source: 'shortcut',
        source_id,
        day,
        starts_at: new Date(segStart).toISOString(),
        ends_at: new Date(segEnd).toISOString(),
        // a part that fills the whole day blocks nothing in particular
        all_day: allDay || (segStart === dayStart && segEnd === dayEnd),
        title,
        location: text(e.location, 200),
        calendar: text(e.calendar, 80),
      })
    }
  }

  return { ok: true, from: b.from, to, events: [...byId.values()] }
}

/** The instant of a London clock hour on a given day, correct across clock changes. */
export function londonTimeIso(day: string, hour: number): string {
  let t = new Date(londonDayStartIso(day)).getTime() + hour * 3_600_000
  t += (hour - londonHour(new Date(t))) * 3_600_000
  return new Date(t).toISOString()
}

const clockFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** HH:MM in London for an instant. */
export function londonClock(iso: string): string {
  return clockFmt.format(new Date(iso))
}

function timed(events: CalendarEvent[]): CalendarEvent[] {
  return events
    .filter(e => !e.all_day)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

/** The meeting in progress, or the next to start. Null when none remain. */
export function nextEvent(events: CalendarEvent[], now: Date): CalendarEvent | null {
  return timed(events).find(e => new Date(e.ends_at) > now) ?? null
}

export interface Gap {
  start: string
  end: string
  minutes: number
}

/** Free time left in the working day, from now, in gaps long enough to focus. */
export function freeGaps(events: CalendarEvent[], day: string, now: Date): Gap[] {
  const windowStart = Math.max(new Date(londonTimeIso(day, WORK_DAY.start)).getTime(), now.getTime())
  const windowEnd = new Date(londonTimeIso(day, WORK_DAY.end)).getTime()
  if (windowStart >= windowEnd) return []

  const gaps: Gap[] = []
  let cursor = windowStart
  const push = (from: number, to: number) => {
    const minutes = Math.floor((to - from) / 60_000)
    if (minutes >= MIN_GAP_MINUTES) {
      gaps.push({ start: new Date(from).toISOString(), end: new Date(to).toISOString(), minutes })
    }
  }

  for (const e of timed(events)) {
    const start = new Date(e.starts_at).getTime()
    const end = new Date(e.ends_at).getTime()
    if (end <= cursor) continue
    if (start >= windowEnd) break
    if (start > cursor) push(cursor, Math.min(start, windowEnd))
    cursor = Math.max(cursor, end)
    if (cursor >= windowEnd) break
  }
  if (cursor < windowEnd) push(cursor, windowEnd)
  return gaps
}

function shortDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatGap(gap: Gap): string {
  return `${londonClock(gap.start)}–${londonClock(gap.end)} (${shortDuration(gap.minutes)})`
}

/** Minutes in timed meetings on the given days. */
export function meetingMinutes(events: CalendarEvent[], days: string[]): number {
  const wanted = new Set(days)
  return timed(events)
    .filter(e => wanted.has(e.day))
    .reduce(
      (sum, e) => sum + Math.round((new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60_000),
      0
    )
}
