import { addDays } from '@/lib/dates'

/** Something got through, for the record of what you deliver. */
export interface DoneEntry {
  id: string
  day: string
  text: string
  created_at: string
}

const MAX_ITEMS = 30
const MAX_LENGTH = 500
const MAX_DAYS_BACK = 30

/**
 * One item per line. Drops bullets, list numbers and a spoken "Done:" or "Done -"
 * prefix, so a dictated list comes out clean.
 */
export function splitDone(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(line =>
      line
        .trim()
        .replace(/^(?:[-*•–]|\d+[.)])\s*/, '')
        .replace(/^done\s*[:\-–]\s*/i, '')
        .trim()
        .slice(0, MAX_LENGTH)
    )
    .filter(line => line !== '')
    .slice(0, MAX_ITEMS)
}

function isRealDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const d = new Date(`${day}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day
}

export function parseDoneBody(
  body: unknown,
  today: string
): { ok: true; day: string; items: string[] } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Send a JSON object' }
  const b = body as Record<string, unknown>
  const items = typeof b.text === 'string' ? splitDone(b.text) : []
  if (items.length === 0) return { ok: false, error: 'text is missing' }

  const day = typeof b.day === 'string' && b.day.trim() !== '' ? b.day.trim() : today
  if (!isRealDay(day)) return { ok: false, error: 'day must be a date as YYYY-MM-DD' }
  if (day > today) return { ok: false, error: 'day cannot be in the future' }
  if (day < addDays(today, -MAX_DAYS_BACK)) return { ok: false, error: `day must be within the last ${MAX_DAYS_BACK} days` }
  return { ok: true, day, items }
}

/** Newest day first; within a day, in the order they were logged. */
export function groupByDay<T extends Pick<DoneEntry, 'day' | 'created_at'>>(rows: T[]): { day: string; items: T[] }[] {
  const days = new Map<string, T[]>()
  for (const row of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    days.set(row.day, [...(days.get(row.day) ?? []), row])
  }
  return [...days.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([day, items]) => ({ day, items }))
}

/** "Thu 19 Nov" */
export function dayHeading(day: string): string {
  return new Date(`${day}T12:00:00Z`)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .replace(',', '')
}

/** Plain text for pasting into a review, CV notes or an email. */
export function asText(groups: { day: string; items: { text: string }[] }[]): string {
  return groups.map(g => [dayHeading(g.day), ...g.items.map(i => `- ${i.text}`)].join('\n')).join('\n\n')
}
