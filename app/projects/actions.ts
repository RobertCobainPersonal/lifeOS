'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { BANDS, parseProjectTask, type Band } from '@/lib/projects'

function revalidate() {
  revalidatePath('/projects', 'layout')
  revalidatePath('/today')
  revalidatePath('/tasks')
}

export async function createProject(name: string): Promise<{ error?: string }> {
  const clean = name.trim().slice(0, 80)
  if (clean === '') return { error: 'Give the project a name' }
  const supabase = await createClient()
  const { error } = await supabase.from('projects').insert({ name: clean })
  if (error) {
    return { error: error.code === '23505' ? 'A project with that name exists' : 'Could not save — try again' }
  }
  revalidate()
  return {}
}

export async function addProjectTask(
  projectId: string,
  title: string,
  band: string
): Promise<{ error?: string }> {
  const parsed = parseProjectTask({ title, band })
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('tasks')
    .select('project_sort')
    .eq('project_id', projectId)
    .eq('band', parsed.band)
    .order('project_sort', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('tasks').insert({
    title: parsed.title,
    domain: 'personal',
    project_id: projectId,
    band: parsed.band,
    project_sort: (last?.project_sort ?? 0) + 1,
  })
  if (error) return { error: 'Could not save — try again' }
  revalidate()
  return {}
}

/** Move a task between Now, Next and Later. It joins the end of the new list. */
export async function setBand(taskId: string, band: Band) {
  if (!BANDS.includes(band)) throw new Error('Unknown band')
  const supabase = await createClient()
  const { data: task, error: readError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()
  if (readError) throw new Error(readError.message)

  const { data: last } = await supabase
    .from('tasks')
    .select('project_sort')
    .eq('project_id', task.project_id)
    .eq('band', band)
    .order('project_sort', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const update: Record<string, unknown> = { band, project_sort: (last?.project_sort ?? 0) + 1 }
  // Leaving Now also leaves today's Top 3
  if (band !== 'now') Object.assign(update, { is_top3: false, top3_date: null })

  const { error } = await supabase.from('tasks').update(update).eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidate()
}

/** Make one project the focus, or clear the focus with null. */
export async function setFocusProject(projectId: string | null) {
  const supabase = await createClient()
  const { error: clearError } = await supabase
    .from('projects')
    .update({ is_focus: false })
    .eq('is_focus', true)
  if (clearError) throw new Error(clearError.message)
  if (projectId) {
    const { error } = await supabase.from('projects').update({ is_focus: true }).eq('id', projectId)
    if (error) throw new Error(error.message)
  }
  revalidate()
}
