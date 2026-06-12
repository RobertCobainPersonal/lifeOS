'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function dismissMorningPlan() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('settings')
    .update({ last_planned_date: today })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/today')
}

export async function confirmMorningPlan(taskIds: string[]) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Clear any existing today top3 — morning plan is the authoritative daily reset
  const { error: clearError } = await supabase
    .from('tasks')
    .update({ is_top3: false, top3_date: null })
    .eq('is_top3', true)
    .eq('top3_date', today)
  if (clearError) throw new Error(clearError.message)

  // Set selected tasks as today's top3
  if (taskIds.length > 0) {
    const { error: setError } = await supabase
      .from('tasks')
      .update({ is_top3: true, top3_date: today })
      .in('id', taskIds)
    if (setError) throw new Error(setError.message)
  }

  // Mark plan done for today
  const { error: settingsError } = await supabase
    .from('settings')
    .update({ last_planned_date: today })
    .eq('id', 1)
  if (settingsError) throw new Error(settingsError.message)

  revalidatePath('/today')
}
