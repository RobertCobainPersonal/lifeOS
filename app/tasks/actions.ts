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
