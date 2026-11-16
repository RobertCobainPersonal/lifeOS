import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'
import { dayTotals } from '@/lib/fuel'
import type { FoodEntry, SavedMeal } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import FoodEntryForm from '@/components/FoodEntryForm'
import FoodEntryRow from '@/components/FoodEntryRow'
import SavedMealList from '@/components/SavedMealList'

export default async function FuelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = londonToday()
  const [dayLog, entriesResult, mealsResult, inbox] = await Promise.all([
    getOrCreateDayLog(supabase, today),
    supabase
      .from('food_entries')
      .select('id, day, label, kcal, protein_g, meal_id, created_at')
      .eq('day', today)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_meals')
      .select('id, name, kcal, protein_g, use_count')
      .order('use_count', { ascending: false })
      .order('name'),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])

  const entries = (entriesResult.data ?? []) as FoodEntry[]
  const meals = (mealsResult.data ?? []) as SavedMeal[]
  const totals = dayTotals(entries)
  const fmt = (n: number) => n.toLocaleString('en-GB')

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <h1 className="text-2xl font-bold">Fuel</h1>

        <section className="bg-gray-900 rounded-xl px-4 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Calories</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(totals.kcal)}</p>
            {dayLog.kcal_target && (
              <p className="text-gray-500 text-sm tabular-nums">of {fmt(dayLog.kcal_target)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Protein</p>
            <p className="text-2xl font-bold tabular-nums">{totals.protein_g} g</p>
            {dayLog.protein_target && (
              <p className="text-gray-500 text-sm tabular-nums">of {dayLog.protein_target} g</p>
            )}
          </div>
        </section>

        <SavedMealList meals={meals} />

        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            Log food
          </h2>
          <FoodEntryForm />
        </section>

        {entries.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              Today
            </h2>
            <div className="bg-gray-900 rounded-xl px-4">
              {entries.map(e => (
                <FoodEntryRow key={e.id} id={e.id} label={e.label} kcal={e.kcal} protein={e.protein_g} />
              ))}
            </div>
          </section>
        )}
      </div>
      <BottomNav current="fuel" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
