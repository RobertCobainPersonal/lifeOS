import { elapsedSeconds } from '@/lib/time'
import type { TimeEntry } from '@/lib/types'

export const DEFAULT_PROMPTS = [
  'What went well today?',
  'What got in the way?',
  'What matters most tomorrow?',
]

/** One to three non-empty journal prompts, each 120 characters or fewer. */
export function cleanPrompts(
  raw: string[]
): { ok: true; prompts: string[] } | { ok: false; error: string } {
  const prompts = raw.map(p => p.trim()).filter(p => p !== '')
  if (prompts.length === 0) return { ok: false, error: 'Keep at least one prompt' }
  if (prompts.length > 3) return { ok: false, error: 'Three prompts at most' }
  if (prompts.some(p => p.length > 120)) {
    return { ok: false, error: 'Keep each prompt to 120 characters' }
  }
  return { ok: true, prompts }
}

export function checkTargets(
  kcal: number,
  protein: number
): { ok: true; kcal: number; protein: number } | { ok: false; error: string } {
  if (!Number.isFinite(kcal) || kcal < 1000 || kcal > 5000) {
    return { ok: false, error: 'Calories must be between 1,000 and 5,000' }
  }
  if (!Number.isFinite(protein) || protein < 0 || protein > 400) {
    return { ok: false, error: 'Protein must be between 0 and 400 g' }
  }
  return { ok: true, kcal: Math.round(kcal), protein: Math.round(protein) }
}

export interface EntrySummary {
  focusMinutes: number
  focusSessions: number
  distractions: number
  /** Minutes by whatever key the summary was asked for (group, activity or older category). */
  minutesByCategory: Record<string, number>
}

type SummaryEntry = Pick<
  TimeEntry,
  'mode' | 'category' | 'activity_id' | 'started_at' | 'ended_at' | 'paused_at' | 'paused_seconds' | 'distractions'
>

/** Totals for a set of time entries. Running entries count up to now. */
export type EntryKey = (e: Pick<TimeEntry, 'category' | 'activity_id'>) => string
export const byCategory: EntryKey = e => e.category ?? e.activity_id ?? 'other'

export function summariseEntries(
  entries: (Omit<SummaryEntry, 'activity_id'> & { activity_id?: string | null })[],
  now: Date,
  keyOf: EntryKey = byCategory
): EntrySummary {
  const seconds: Record<string, number> = {}
  let focusSeconds = 0
  let focusSessions = 0
  let distractions = 0

  for (const e of entries) {
    const s = elapsedSeconds(e, now)
    const key = keyOf({ category: e.category, activity_id: e.activity_id ?? null })
    seconds[key] = (seconds[key] ?? 0) + s
    distractions += e.distractions
    if (e.mode === 'focus') {
      focusSeconds += s
      focusSessions += 1
    }
  }

  const minutesByCategory: Record<string, number> = {}
  for (const [category, s] of Object.entries(seconds)) {
    const minutes = Math.round(s / 60)
    if (minutes > 0) minutesByCategory[category] = minutes
  }

  return { focusMinutes: Math.round(focusSeconds / 60), focusSessions, distractions, minutesByCategory }
}

/** Whether saving the close-out should change tomorrow's one thing, and to what. */
export function tomorrowChange(
  pick: string | null,
  existing: string | null
): { write: boolean; taskId: string | null } {
  return { write: pick !== existing, taskId: pick }
}
