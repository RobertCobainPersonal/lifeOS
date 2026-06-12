'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeTask(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw new Error(error.message)

  revalidatePath('/tasks')
  revalidatePath('/today')
}

export async function addToTop3(taskId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('is_top3', true)
    .eq('top3_date', today)
    .eq('status', 'open')

  if ((count ?? 0) >= 3) {
    throw new Error('Top 3 is full — remove one first')
  }

  const { error } = await supabase
    .from('tasks')
    .update({ is_top3: true, top3_date: today })
    .eq('id', taskId)
  if (error) throw new Error(error.message)

  revalidatePath('/today')
  revalidatePath('/tasks')
}

export async function removeFromTop3(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ is_top3: false, top3_date: null })
    .eq('id', taskId)
  if (error) throw new Error(error.message)

  revalidatePath('/today')
  revalidatePath('/tasks')
}
