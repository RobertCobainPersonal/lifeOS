import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'
import { dayTotals, resolveBands } from '@/lib/fuel'
import { isOn } from '@/lib/features'
import DayTypePicker from '@/components/DayTypePicker'
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
  const [dayLog, entriesResult, mealsResult, inbox, settings] = await Promise.all([
    getOrCreateDayLog(supabase, today),
    supabase
      .from('food_entries')
      .select('id, day, label, kcal, protein_g, carbs_g, fat_g, meal_id, created_at')
      .eq('day', today)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_meals')
      .select('id, name, kcal, protein_g, carbs_g, fat_g, use_count')
      .order('use_count', { ascending: false })
      .order('name'),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
    supabase.from('settings').select('features, kcal_bands').eq('id', 1).single(),
  ])
  const detailed = isOn(settings.data?.features, 'detailed_nutrition')

  const entries = (entriesResult.data ?? []) as FoodEntry[]
  const meals = (mealsResult.data ?? []) as SavedMeal[]
  const totals = dayTotals(entries)
  const fmt = (n: number) => n.toLocaleString('en-GB')

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <h1 className="text-2xl font-bold">Fuel</h1>

        <section className="bg-card ring-1 ring-line rounded-xl px-4 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Calories</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(totals.kcal)}</p>
            {dayLog.kcal_target && (
              <p className="text-muted text-sm tabular-nums">of {fmt(dayLog.kcal_target)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Protein</p>
            <p className="text-2xl font-bold tabular-nums">{totals.protein_g} g</p>
            {dayLog.protein_target && (
              <p className="text-muted text-sm tabular-nums">of {dayLog.protein_target} g</p>
            )}
          </div>
          {detailed && (
            <p className="col-span-2 text-muted text-sm tabular-nums border-t border-line pt-3">
              Carbs {totals.carbs_g} g · Fat {totals.fat_g} g
            </p>
          )}
        </section>

        {detailed && (
          <DayTypePicker bands={resolveBands(settings.data?.kcal_bands)} current={dayLog.day_type ?? null} />
        )}

        <SavedMealList meals={meals} detailed={detailed} />

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            Log food
          </h2>
          <FoodEntryForm detailed={detailed} />
        </section>

        {entries.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              Today
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4">
              {entries.map(e => (
                <FoodEntryRow
                  key={e.id}
                  id={e.id}
                  label={e.label}
                  kcal={e.kcal}
                  protein={e.protein_g}
                  macros={detailed ? { carbs: e.carbs_g, fat: e.fat_g } : null}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <BottomNav current="fuel" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
