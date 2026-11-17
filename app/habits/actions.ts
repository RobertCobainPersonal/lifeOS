'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { londonToday } from '@/lib/dates'
import { parseHabitName } from '@/lib/habits'

function revalidate() {
  revalidatePath('/today')
  revalidatePath('/settings')
  revalidatePath('/record')
}

export async function addHabit(name: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: existing } = await supabase.from('habits').select('name, sort').eq('archived', false)
  const parsed = parseHabitName(name, (existing ?? []).map(h => h.name))
  if (!parsed.ok) return { error: parsed.error }
  const nextSort = Math.max(0, ...(existing ?? []).map(h => h.sort)) + 1
  const { error } = await supabase.from('habits').insert({ name: parsed.name, sort: nextSort })
  if (error) return { error: 'Could not save — try again' }
  revalidate()
  return {}
}

/** Take one off the list. Its past ticks are kept. */
export async function removeHabit(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('habits').update({ archived: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}

export async function setTick(habitId: string, done: boolean) {
  const supabase = await createClient()
  const day = londonToday()
  const { error } = done
    ? await supabase
        .from('habit_ticks')
        .upsert({ habit_id: habitId, day }, { onConflict: 'habit_id,day', ignoreDuplicates: true })
    : await supabase.from('habit_ticks').delete().eq('habit_id', habitId).eq('day', day)
  if (error) throw new Error(error.message)
  revalidate()
}
