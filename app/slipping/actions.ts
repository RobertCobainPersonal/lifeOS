'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function doTodaySlipping(taskId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('tasks')
    .update({ due_date: today })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/slipping')
  revalidatePath('/today')
}

export async function rescheduleSlipping(taskId: string, dueDate: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ due_date: dueDate })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/slipping')
}

export async function someDaySlipping(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'someday' })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/slipping')
}

export async function deleteSlipping(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/slipping')
  revalidatePath('/today')
  revalidatePath('/tasks')
}
