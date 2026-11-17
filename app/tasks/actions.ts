'use server'

import { londonToday } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseNewTask } from '@/lib/tasks'

export async function completeTask(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw new Error(error.message)

  revalidatePath('/tasks')
  revalidatePath('/today')
  revalidatePath('/projects', 'layout')
}

export async function addToTop3(taskId: string) {
  const supabase = await createClient()
  const today = londonToday()

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
  revalidatePath('/projects', 'layout')
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
  revalidatePath('/projects', 'layout')
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
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/today')
}

/**
 * Create a task directly (not via the Inbox). Optionally pin it to today's
 * Top 3; if Top 3 is full the task is still created and the caller is told.
 */
export async function createTask(input: {
  title: string
  domain: string
  energy: string
  dueDate: string
  top3: boolean
}): Promise<{ error?: string; top3Full?: boolean }> {
  const parsed = parseNewTask(input)
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()
  const today = londonToday()

  let pin = false
  if (input.top3) {
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
    pin = (localResult.count ?? 0) + (clickupResult.count ?? 0) < 3
  }

  const { error } = await supabase.from('tasks').insert({
    title: parsed.title,
    domain: parsed.domain,
    energy: parsed.energy,
    due_date: parsed.due_date,
    status: 'open',
    ...(pin ? { is_top3: true, top3_date: today } : {}),
  })
  if (error) return { error: 'Could not save — try again' }

  revalidatePath('/today')
  revalidatePath('/tasks')
  return input.top3 && !pin ? { top3Full: true } : {}
}
