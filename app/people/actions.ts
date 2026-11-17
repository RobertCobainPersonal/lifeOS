'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { londonToday } from '@/lib/dates'
import { parsePerson } from '@/lib/people'

function revalidate() {
  revalidatePath('/people')
  revalidatePath('/today')
}

export async function addPerson(input: { name: string; cadence: string }): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: existing } = await supabase.from('people').select('name').eq('archived', false)
  const parsed = parsePerson(input, (existing ?? []).map(p => p.name))
  if (!parsed.ok) return { error: parsed.error }
  const { error } = await supabase
    .from('people')
    .insert({ name: parsed.name, cadence_days: parsed.cadence_days })
  if (error) return { error: 'Could not save — try again' }
  revalidate()
  return {}
}

/** Record that you were in touch today, with an optional note for next time. */
export async function markContacted(id: string, note: string) {
  const supabase = await createClient()
  const clean = note.trim().slice(0, 500)
  const { error } = await supabase
    .from('people')
    .update({ last_contact: londonToday(), ...(clean ? { note: clean } : {}) })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}

export async function removePerson(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('people').update({ archived: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}
