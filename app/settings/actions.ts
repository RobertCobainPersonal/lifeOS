'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
