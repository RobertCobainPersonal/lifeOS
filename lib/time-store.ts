import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { londonDate } from '@/lib/dates'
import { endFields } from '@/lib/time'
import { indexActivities, type Activity, type ActivityIndex } from '@/lib/activities'
import type { Category, TimeEntry } from '@/lib/types'

export const ENTRY_COLUMNS =
  'id, day, mode, category, activity_id, energy, task_id, clickup_id, label, planned_minutes, started_at, ended_at, paused_at, paused_seconds, distractions, done_note, next_note'

export const ACTIVITY_COLUMNS = 'id, name, parent_id, sort, archived, legacy_category'

/** Every activity, archived included, so older entries keep their names. */
export async function getActivities(supabase: SupabaseClient): Promise<ActivityIndex> {
  const { data, error } = await supabase.from('time_activities').select(ACTIVITY_COLUMNS)
  if (error) throw new Error(error.message)
  return indexActivities((data ?? []) as Activity[])
}

/** What an entry records about its activity. Older categories are kept for older reports. */
export type EntryActivity = Pick<Activity, 'id' | 'legacy_category'>
const activityFields = (a: EntryActivity | null, fallback: Category | null = null) => ({
  activity_id: a?.id ?? null,
  category: ((a ? a.legacy_category : null) ?? fallback) as Category | null,
})

export type StartResult = { entry: TimeEntry } | { error: 'focus_running' | 'busy' }

export async function getOpenEntry(supabase: SupabaseClient): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(ENTRY_COLUMNS)
    .is('ended_at', null)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as TimeEntry | null) ?? null
}

/** End the running entry, if any. Returns the ended entry or null. */
export async function stopOpenEntry(supabase: SupabaseClient, now: Date): Promise<TimeEntry | null> {
  const open = await getOpenEntry(supabase)
  if (!open) return null
  const { data, error } = await supabase
    .from('time_entries')
    .update(endFields(open, now))
    .eq('id', open.id)
    .select(ENTRY_COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  return data as TimeEntry
}

/**
 * Start an entry. A running Track entry is ended first (switching);
 * a running Focus session must be ended by the user.
 */
export async function startEntry(
  supabase: SupabaseClient,
  input: {
    mode: 'focus' | 'track'
    activity: EntryActivity | null
    label: string | null
    energy: number | null
    taskId?: string | null
    clickupId?: string | null
    plannedMinutes?: number | null
  },
  now: Date
): Promise<StartResult> {
  const open = await getOpenEntry(supabase)
  if (open?.mode === 'focus') return { error: 'focus_running' }
  if (open) {
    const { error } = await supabase
      .from('time_entries')
      .update(endFields(open, now))
      .eq('id', open.id)
    if (error) throw new Error(error.message)
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      day: londonDate(now),
      mode: input.mode,
      ...activityFields(input.activity, input.mode === 'focus' ? 'deep_work' : null),
      label: input.label,
      energy: input.energy,
      task_id: input.taskId ?? null,
      clickup_id: input.clickupId ?? null,
      planned_minutes: input.mode === 'focus' ? input.plannedMinutes : null,
      started_at: now.toISOString(),
    })
    .select(ENTRY_COLUMNS)
    .single()
  // 23505: another request opened an entry between our check and insert
  if (error?.code === '23505') return { error: 'busy' }
  if (error) throw new Error(error.message)
  return { entry: data as TimeEntry }
}

/** Record a finished block of minutes ending now. */
export async function logBlock(
  supabase: SupabaseClient,
  input: { activity: EntryActivity; minutes: number; label: string | null; energy: number | null },
  now: Date
): Promise<TimeEntry> {
  const startedAt = new Date(now.getTime() - input.minutes * 60_000)
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      day: londonDate(startedAt),
      mode: 'track',
      ...activityFields(input.activity),
      label: input.label,
      energy: input.energy,
      started_at: startedAt.toISOString(),
      ended_at: now.toISOString(),
    })
    .select(ENTRY_COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  return data as TimeEntry
}
