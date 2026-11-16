'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cleanEnergy, endFields, isCategory, pauseFields } from '@/lib/time'
import { ENTRY_COLUMNS, startEntry, stopOpenEntry } from '@/lib/time-store'
import type { Category, TimeEntry } from '@/lib/types'

type StartOutcome = { id: string } | { error: 'focus_running' }

function revalidate() {
  revalidatePath('/today')
  revalidatePath('/time')
}

export async function startFocus(input: {
  taskId?: string
  clickupId?: string
  label: string
  plannedMinutes: number
  energy?: number | null
}): Promise<StartOutcome> {
  const minutes = Math.round(input.plannedMinutes)
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
    throw new Error('Length must be between 1 and 240 minutes')
  }
  const supabase = await createClient()
  const result = await startEntry(
    supabase,
    {
      mode: 'focus',
      category: 'deep_work',
      label: input.label.trim().slice(0, 120) || 'Focus',
      energy: cleanEnergy(input.energy),
      taskId: input.taskId ?? null,
      clickupId: input.clickupId ?? null,
      plannedMinutes: minutes,
    },
    new Date()
  )
  revalidate()
  return 'error' in result ? result : { id: result.entry.id }
}

export async function startTrack(input: {
  category: Category
  label?: string
  energy?: number | null
}): Promise<StartOutcome> {
  if (!isCategory(input.category)) throw new Error('Unknown category')
  const supabase = await createClient()
  const result = await startEntry(
    supabase,
    {
      mode: 'track',
      category: input.category,
      label: input.label?.trim().slice(0, 120) || null,
      energy: cleanEnergy(input.energy),
    },
    new Date()
  )
  revalidate()
  return 'error' in result ? result : { id: result.entry.id }
}

export async function stopEntry() {
  const supabase = await createClient()
  await stopOpenEntry(supabase, new Date())
  revalidate()
}

async function loadOpen(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(ENTRY_COLUMNS)
    .eq('id', id)
    .is('ended_at', null)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as TimeEntry | null
}

export async function togglePause(id: string) {
  const supabase = await createClient()
  const entry = await loadOpen(supabase, id)
  if (!entry) return
  const { error } = await supabase
    .from('time_entries')
    .update(pauseFields(entry, new Date()))
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}

export async function logDistraction(id: string) {
  const supabase = await createClient()
  const entry = await loadOpen(supabase, id)
  if (!entry) return
  const { error } = await supabase
    .from('time_entries')
    .update({ distractions: entry.distractions + 1 })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}

export async function endFocus(
  id: string,
  doneNote: string,
  nextNote: string,
  completeTask: boolean
) {
  const supabase = await createClient()
  const entry = await loadOpen(supabase, id)
  if (!entry) {
    revalidate()
    return
  }
  const now = new Date()
  const done = doneNote.trim().slice(0, 500)
  const next = nextNote.trim().slice(0, 500)

  const { error } = await supabase
    .from('time_entries')
    .update({ ...endFields(entry, now), done_note: done || null, next_note: next || null })
    .eq('id', id)
  if (error) throw new Error(error.message)

  const finishing = completeTask && !!entry.task_id
  if (finishing) {
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: now.toISOString() })
      .eq('id', entry.task_id)
    if (taskError) throw new Error(taskError.message)
  }

  // "What's next" becomes a capture so the next session has a starting point
  if (next && !finishing) {
    const { error: captureError } = await supabase.from('captures').insert({
      raw_text: entry.label ? `Next for "${entry.label}": ${next}` : next,
      source: 'manual',
    })
    if (captureError) throw new Error(captureError.message)
  }

  revalidate()
  revalidatePath('/tasks')
  revalidatePath('/inbox')
}
