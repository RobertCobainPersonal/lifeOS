'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkTargets, cleanPrompts } from '@/lib/closeout'
import { londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'

export async function updateSlippingDays(days: number) {
  if (days < 1 || days > 90) throw new Error('Threshold must be between 1 and 90 days')
  const supabase = await createClient()
  const { error } = await supabase
    .from('settings')
    .update({ slipping_days: days })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/today')
  revalidatePath('/slipping')
}

export async function updateJournalPrompts(prompts: string[]) {
  const cleaned = cleanPrompts(prompts)
  if (!cleaned.ok) throw new Error(cleaned.error)
  const supabase = await createClient()
  const { error } = await supabase
    .from('settings')
    .update({ journal_prompts: cleaned.prompts })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/today/close')
}

export async function updateTargets(kcal: number, protein: number) {
  const checked = checkTargets(kcal, protein)
  if (!checked.ok) throw new Error(checked.error)
  const supabase = await createClient()
  const { error } = await supabase
    .from('settings')
    .update({ default_kcal: checked.kcal, default_protein: checked.protein })
    .eq('id', 1)
  if (error) throw new Error(error.message)

  // Today follows the new targets too
  const today = londonToday()
  await getOrCreateDayLog(supabase, today)
  const { error: logError } = await supabase
    .from('day_log')
    .update({ kcal_target: checked.kcal, protein_target: checked.protein })
    .eq('day', today)
  if (logError) throw new Error(logError.message)

  revalidatePath('/settings')
  revalidatePath('/today')
  revalidatePath('/fuel')
}
