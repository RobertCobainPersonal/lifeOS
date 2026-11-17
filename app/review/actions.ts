'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { londonToday } from '@/lib/dates'

export async function completeReview() {
  const supabase = await createClient()
  const { error } = await supabase
    .from('settings')
    .update({ last_review_date: londonToday() })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/review')
  revalidatePath('/today')
}
