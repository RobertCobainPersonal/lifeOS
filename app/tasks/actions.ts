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

  const [localResult, clickupResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_top3', true)
      .eq('top3_date', today)
      .eq('status', 'open'),
    supabase
      .from('clickup_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('pinned_top3_date', today),
  ])
  const totalTop3 = (localResult.count ?? 0) + (clickupResult.count ?? 0)

  if (totalTop3 >= 3) {
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

export async function updateTask(
  taskId: string,
  fields: {
    title: string
    domain: 'work' | 'personal' | null
    energy: 'deep' | 'admin' | null
    dueDate: string | null
    details: string | null
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({
      title: fields.title,
      domain: fields.domain,
      energy: fields.energy,
      due_date: fields.dueDate || null,
      details: fields.details || null,
    })
    .eq('id', taskId)
  if (error) throw new Error(error.message)

  revalidatePath('/tasks')
  revalidatePath('/today')
}
