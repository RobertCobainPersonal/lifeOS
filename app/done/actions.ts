'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { londonToday } from '@/lib/dates'
import { parseDoneBody } from '@/lib/done'

function revalidate() {
  revalidatePath('/today')
  revalidatePath('/today/close')
  revalidatePath('/done')
  revalidatePath('/review')
}

export async function addDone(text: string, day?: string): Promise<{ error?: string }> {
  const parsed = parseDoneBody({ text, day }, londonToday(new Date()))
  if (!parsed.ok) return { error: parsed.error }
  const supabase = await createClient()
  const { error } = await supabase
    .from('done_entries')
    .insert(parsed.items.map(t => ({ day: parsed.day, text: t, source: 'app' })))
  if (error) throw new Error(error.message)
  revalidate()
  return {}
}

export async function removeDone(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('done_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}
