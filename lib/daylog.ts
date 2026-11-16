import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DayLog } from '@/lib/types'

const COLUMNS =
  'day, one_thing_task_id, one_thing_clickup_id, kcal_target, protein_target, closeout, closed_at'

/** Fetch the log row for a day, creating it with the default targets if missing. */
export async function getOrCreateDayLog(supabase: SupabaseClient, day: string): Promise<DayLog> {
  const existing = await supabase.from('day_log').select(COLUMNS).eq('day', day).maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data) return existing.data as DayLog

  const settings = await supabase
    .from('settings')
    .select('default_kcal, default_protein')
    .eq('id', 1)
    .single()

  const created = await supabase
    .from('day_log')
    .upsert(
      {
        day,
        kcal_target: settings.data?.default_kcal ?? 2400,
        protein_target: settings.data?.default_protein ?? 160,
      },
      { onConflict: 'day', ignoreDuplicates: true }
    )
    .select(COLUMNS)
    .maybeSingle()
  if (created.error) throw new Error(created.error.message)
  if (created.data) return created.data as DayLog

  // Another request created it first.
  const again = await supabase.from('day_log').select(COLUMNS).eq('day', day).single()
  if (again.error) throw new Error(again.error.message)
  return again.data as DayLog
}
