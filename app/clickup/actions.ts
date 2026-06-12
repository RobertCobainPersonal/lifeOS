'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTop3Count(supabase: Awaited<ReturnType<typeof createClient>>, today: string) {
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
  return (localResult.count ?? 0) + (clickupResult.count ?? 0)
}

export async function pinClickUpToTop3(clickupId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const total = await getTop3Count(supabase, today)
  if (total >= 3) throw new Error('Top 3 is full — remove one first')

  const { error } = await supabase
    .from('clickup_tasks')
    .update({ pinned_top3_date: today })
    .eq('clickup_id', clickupId)
  if (error) throw new Error(error.message)

  revalidatePath('/today')
  revalidatePath('/clickup')
}

export async function unpinClickUpFromTop3(clickupId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clickup_tasks')
    .update({ pinned_top3_date: null })
    .eq('clickup_id', clickupId)
  if (error) throw new Error(error.message)

  revalidatePath('/today')
  revalidatePath('/clickup')
}
