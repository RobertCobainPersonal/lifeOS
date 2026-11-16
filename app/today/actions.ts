'use server'

import { addDays, londonToday } from '@/lib/dates'
import { DEFAULT_PROMPTS } from '@/lib/closeout'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateDayLog } from '@/lib/daylog'
import { revalidatePath } from 'next/cache'

export async function resetMyDay(keepIds: string[], allShownIds: string[]) {
  const supabase = await createClient()
  const today = londonToday()
  const deferIds = allShownIds.filter(id => !keepIds.includes(id))

  // Clear today's top3 for local tasks
  const { error: clearError } = await supabase
    .from('tasks')
    .update({ is_top3: false, top3_date: null })
    .eq('is_top3', true)
    .eq('top3_date', today)
  if (clearError) throw new Error(clearError.message)

  // Mark deferred tasks
  if (deferIds.length > 0) {
    const { error } = await supabase
      .from('tasks')
      .update({ deferred_by_reset: true })
      .in('id', deferIds)
    if (error) throw new Error(error.message)
  }

  // Set kept tasks as today's new top3
  if (keepIds.length > 0) {
    const { error } = await supabase
      .from('tasks')
      .update({ is_top3: true, top3_date: today, deferred_by_reset: false })
      .in('id', keepIds)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/today')
}

export async function dismissMorningPlan() {
  const supabase = await createClient()
  const today = londonToday()
  const { error } = await supabase
    .from('settings')
    .update({ last_planned_date: today })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/today')
}

export async function confirmMorningPlan(
  taskIds: string[],
  oneThingId: string | null,
  clickupIds: string[] = []
) {
  if (taskIds.length + clickupIds.length > 3) throw new Error('Top 3 holds three items')
  const supabase = await createClient()
  const today = londonToday()

  // Morning plan is the authoritative daily reset: clear today's local and work pins
  const { error: clearError } = await supabase
    .from('tasks')
    .update({ is_top3: false, top3_date: null })
    .eq('is_top3', true)
    .eq('top3_date', today)
  if (clearError) throw new Error(clearError.message)

  const { error: clearWorkError } = await supabase
    .from('clickup_tasks')
    .update({ pinned_top3_date: null })
    .eq('pinned_top3_date', today)
  if (clearWorkError) throw new Error(clearWorkError.message)

  if (taskIds.length > 0) {
    const { error: setError } = await supabase
      .from('tasks')
      .update({ is_top3: true, top3_date: today, deferred_by_reset: false })
      .in('id', taskIds)
    if (setError) throw new Error(setError.message)
  }

  if (clickupIds.length > 0) {
    const { error: pinError } = await supabase
      .from('clickup_tasks')
      .update({ pinned_top3_date: today })
      .in('clickup_id', clickupIds)
    if (pinError) throw new Error(pinError.message)
  }

  await getOrCreateDayLog(supabase, today)
  const isWork = oneThingId !== null && clickupIds.includes(oneThingId)
  const { error: logError } = await supabase
    .from('day_log')
    .update({
      one_thing_task_id: oneThingId && !isWork ? oneThingId : null,
      one_thing_clickup_id: isWork ? oneThingId : null,
    })
    .eq('day', today)
  if (logError) throw new Error(logError.message)

  const { error: settingsError } = await supabase
    .from('settings')
    .update({ last_planned_date: today })
    .eq('id', 1)
  if (settingsError) throw new Error(settingsError.message)

  revalidatePath('/today')
}

export async function setOneThing(
  ref: { taskId: string } | { clickupId: string } | null
) {
  const supabase = await createClient()
  const today = londonToday()
  await getOrCreateDayLog(supabase, today)

  const { error } = await supabase
    .from('day_log')
    .update({
      one_thing_task_id: ref && 'taskId' in ref ? ref.taskId : null,
      one_thing_clickup_id: ref && 'clickupId' in ref ? ref.clickupId : null,
    })
    .eq('day', today)
  if (error) throw new Error(error.message)

  // Make sure the one thing is among today's pins when there is room.
  if (ref) {
    const [local, work] = await Promise.all([
      supabase
        .from('tasks')
        .select('id')
        .eq('is_top3', true)
        .eq('top3_date', today)
        .eq('status', 'open'),
      supabase.from('clickup_tasks').select('clickup_id').eq('pinned_top3_date', today),
    ])
    const localIds = (local.data ?? []).map(t => t.id)
    const workIds = (work.data ?? []).map(t => t.clickup_id)
    const hasRoom = localIds.length + workIds.length < 3
    if ('taskId' in ref && !localIds.includes(ref.taskId) && hasRoom) {
      await supabase
        .from('tasks')
        .update({ is_top3: true, top3_date: today })
        .eq('id', ref.taskId)
    }
    if ('clickupId' in ref && !workIds.includes(ref.clickupId) && hasRoom) {
      await supabase
        .from('clickup_tasks')
        .update({ pinned_top3_date: today })
        .eq('clickup_id', ref.clickupId)
    }
  }

  revalidatePath('/today')
}

export async function saveCloseout(answers: string[], tomorrowTaskId: string | null) {
  const supabase = await createClient()
  const today = londonToday()
  await getOrCreateDayLog(supabase, today)

  const { data: settings } = await supabase
    .from('settings')
    .select('journal_prompts')
    .eq('id', 1)
    .single()
  const prompts: string[] = Array.isArray(settings?.journal_prompts)
    ? settings.journal_prompts
    : DEFAULT_PROMPTS

  const { error } = await supabase
    .from('day_log')
    .update({
      closeout: {
        prompts,
        answers: prompts.map((_, i) => (answers[i] ?? '').trim().slice(0, 2000)),
      },
      closed_at: new Date().toISOString(),
    })
    .eq('day', today)
  if (error) throw new Error(error.message)

  if (tomorrowTaskId) {
    const tomorrow = addDays(today, 1)
    await getOrCreateDayLog(supabase, tomorrow)
    const { error: tomorrowError } = await supabase
      .from('day_log')
      .update({ one_thing_task_id: tomorrowTaskId, one_thing_clickup_id: null })
      .eq('day', tomorrow)
    if (tomorrowError) throw new Error(tomorrowError.message)
  }

  revalidatePath('/today')
  revalidatePath('/today/close')
}
