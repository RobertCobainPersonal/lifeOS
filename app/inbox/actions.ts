'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function triageCapture(
  captureId: string,
  result: 'someday' | 'done' | 'deleted'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('captures')
    .update({ triaged_at: new Date().toISOString(), triage_result: result })
    .eq('id', captureId)

  if (error) throw new Error(error.message)

  revalidatePath('/inbox')
  revalidatePath('/today')
}

export async function createTaskFromCapture(
  captureId: string,
  task: {
    title: string
    domain: 'work' | 'personal'
    energy: 'deep' | 'admin'
    dueDate: string | null
    details: string | null
  }
) {
  const supabase = await createClient()

  const { error: taskError } = await supabase.from('tasks').insert({
    capture_id: captureId,
    title: task.title,
    domain: task.domain,
    energy: task.energy,
    due_date: task.dueDate || null,
    details: task.details || null,
    status: 'open',
  })
  if (taskError) throw new Error(taskError.message)

  const { error: captureError } = await supabase
    .from('captures')
    .update({ triaged_at: new Date().toISOString(), triage_result: 'task' })
    .eq('id', captureId)
  if (captureError) throw new Error(captureError.message)

  revalidatePath('/inbox')
  revalidatePath('/tasks')
  revalidatePath('/today')
}
