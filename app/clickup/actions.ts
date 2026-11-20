'use server'

import { londonToday } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseListRef, parseTaskRef } from '@/lib/clickup-follow'
import { browse, getList, getTask, syncFollows, type BrowseSpace } from '@/lib/clickup'

type Result = { error?: string }

function revalidate() {
  revalidatePath('/clickup')
  revalidatePath('/today')
}

async function getTop3Count(supabase: Awaited<ReturnType<typeof createClient>>, today: string) {
  const [localResult, clickupResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_top3', true)
      .eq('top3_date', today)
      .eq('status', 'open'),
    supabase.from('clickup_tasks').select('*', { count: 'exact', head: true }).eq('pinned_top3_date', today),
  ])
  return (localResult.count ?? 0) + (clickupResult.count ?? 0)
}

export async function pinClickUpToTop3(clickupId: string) {
  const supabase = await createClient()
  const today = londonToday()
  const total = await getTop3Count(supabase, today)
  if (total >= 3) throw new Error('Top 3 is full — remove one first')
  const { error } = await supabase.from('clickup_tasks').update({ pinned_top3_date: today }).eq('clickup_id', clickupId)
  if (error) throw new Error(error.message)
  revalidate()
}

export async function unpinClickUpFromTop3(clickupId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('clickup_tasks').update({ pinned_top3_date: null }).eq('clickup_id', clickupId)
  if (error) throw new Error(error.message)
  revalidate()
}

/** Spaces, folders and lists to choose from. */
export async function browseClickUp(): Promise<{ spaces?: BrowseSpace[]; error?: string }> {
  try {
    return { spaces: await browse() }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not load ClickUp' }
  }
}

/** Follow a list by id (from the picker) or by pasted link. */
export async function followList(ref: string): Promise<Result> {
  const id = parseListRef(ref)
  if (!id) return { error: 'That doesn’t look like a ClickUp list link' }
  let info
  try {
    info = await getList(id)
  } catch {
    return { error: 'ClickUp couldn’t find that list' }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('clickup_follows')
    .upsert({ kind: 'list', clickup_id: info.id, name: info.name, path: info.path }, { onConflict: 'kind,clickup_id' })
  if (error) throw new Error(error.message)
  await syncFollows(supabase)
  revalidate()
  return {}
}

/** Follow one task by pasted link, id or custom id. */
export async function followTask(ref: string): Promise<Result> {
  const parsed = parseTaskRef(ref)
  if (!parsed) return { error: 'That doesn’t look like a ClickUp task link' }
  let task
  try {
    task = await getTask(parsed.id, parsed.custom)
  } catch {
    return { error: 'ClickUp couldn’t find that task' }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('clickup_follows')
    .upsert(
      { kind: 'task', clickup_id: task.id, name: task.name, path: task.list?.name ?? null },
      { onConflict: 'kind,clickup_id' }
    )
  if (error) throw new Error(error.message)
  await syncFollows(supabase)
  revalidate()
  return {}
}

export async function unfollow(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('clickup_follows').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await syncFollows(supabase)
  revalidate()
}
