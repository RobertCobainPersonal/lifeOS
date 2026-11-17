'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseActivityName, reorder } from '@/lib/activities'
import { getActivities } from '@/lib/time-store'

type Result = { error?: string }

function revalidate() {
  revalidatePath('/settings')
  revalidatePath('/time')
  revalidatePath('/record')
}

/** Add a group (no parent) or a part of a live group. */
export async function addActivity(name: string, parentId: string | null): Promise<Result> {
  const supabase = await createClient()
  const idx = await getActivities(supabase)
  if (parentId !== null) {
    const parent = idx.byId.get(parentId)
    if (!parent || parent.archived || parent.parent_id !== null) return { error: 'That group is no longer there' }
  }
  const siblings = parentId === null ? idx.groups : idx.partsOf(parentId)
  const parsed = parseActivityName(name, siblings.map(s => s.name))
  if (!parsed.ok) return { error: parsed.error }

  const { error } = await supabase.from('time_activities').insert({
    name: parsed.name,
    parent_id: parentId,
    sort: Math.max(0, ...siblings.map(s => s.sort)) + 1,
  })
  if (error) throw new Error(error.message)
  revalidate()
  return {}
}

export async function renameActivity(id: string, name: string): Promise<Result> {
  const supabase = await createClient()
  const idx = await getActivities(supabase)
  const current = idx.byId.get(id)
  if (!current) return { error: 'That activity is no longer there' }
  const siblings = (current.parent_id === null ? idx.groups : idx.partsOf(current.parent_id)).filter(s => s.id !== id)
  const parsed = parseActivityName(name, siblings.map(s => s.name))
  if (!parsed.ok) return { error: parsed.error }

  const { error } = await supabase.from('time_activities').update({ name: parsed.name }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
  return {}
}

/** Archived activities leave the picker but keep their past time and names. */
export async function setActivityArchived(id: string, archived: boolean): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('time_activities').update({ archived }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
  return {}
}

export async function moveActivity(id: string, dir: -1 | 1): Promise<Result> {
  const supabase = await createClient()
  const idx = await getActivities(supabase)
  const current = idx.byId.get(id)
  if (!current) return { error: 'That activity is no longer there' }
  const siblings = current.parent_id === null ? idx.groups : idx.partsOf(current.parent_id)
  const order = reorder(siblings, id, dir)
  if (!order) return {}
  for (const row of order) {
    const { error } = await supabase.from('time_activities').update({ sort: row.sort }).eq('id', row.id)
    if (error) throw new Error(error.message)
  }
  revalidate()
  return {}
}
