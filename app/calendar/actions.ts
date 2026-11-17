'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { parseManualEvent } from '@/lib/calendar'

function revalidate() {
  revalidatePath('/today')
  revalidatePath('/week')
  revalidatePath('/record')
}

/**
 * Add an event typed into LifeOS. Stored with source 'manual', so the
 * Calendar Shortcut's daily replace never removes it.
 */
export async function addEvent(input: {
  title: string
  day: string
  start: string
  end: string
  allDay: boolean
  location: string
}): Promise<{ error?: string }> {
  const parsed = parseManualEvent(input)
  if (!parsed.ok) return { error: parsed.error }
  const supabase = await createClient()
  const { error } = await supabase.from('calendar_events').insert({
    source: 'manual',
    source_id: randomUUID(),
    ...parsed.event,
    calendar: 'LifeOS',
  })
  if (error) return { error: 'Could not save — try again' }
  revalidate()
  return {}
}

/** Remove an event typed into LifeOS. Events from the phone calendar cannot be removed here. */
export async function removeEvent(sourceId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('source', 'manual')
    .eq('source_id', sourceId)
  if (error) throw new Error(error.message)
  revalidate()
}
