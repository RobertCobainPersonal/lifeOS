'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { londonToday } from '@/lib/dates'
import { getOrCreateDayLog } from '@/lib/daylog'
import { parseFoodInput, resolveBands, type DayType } from '@/lib/fuel'

function revalidate() {
  revalidatePath('/fuel')
  revalidatePath('/today')
  revalidatePath('/today/close')
}

export async function addFood(input: {
  label: string
  kcal: string
  protein: string
  carbs?: string
  fat?: string
  saveAsMeal: boolean
}): Promise<{ error?: string }> {
  const parsed = parseFoodInput(input)
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()
  let mealId: string | null = null

  if (input.saveAsMeal) {
    // A meal saved under an existing name updates that meal's figures
    const { data: meal, error: mealError } = await supabase
      .from('saved_meals')
      .upsert(
        {
          name: parsed.label,
          kcal: parsed.kcal,
          protein_g: parsed.protein_g,
          carbs_g: parsed.carbs_g,
          fat_g: parsed.fat_g,
        },
        { onConflict: 'name' }
      )
      .select('id, use_count')
      .single()
    if (mealError) return { error: 'Could not save the meal — try again' }
    mealId = meal.id
    await supabase
      .from('saved_meals')
      .update({ use_count: meal.use_count + 1 })
      .eq('id', meal.id)
  }

  const { error } = await supabase.from('food_entries').insert({
    day: londonToday(),
    label: parsed.label,
    kcal: parsed.kcal,
    protein_g: parsed.protein_g,
    carbs_g: parsed.carbs_g,
    fat_g: parsed.fat_g,
    meal_id: mealId,
  })
  if (error) return { error: 'Could not save — try again' }

  revalidate()
  return {}
}

export async function logSavedMeal(mealId: string) {
  const supabase = await createClient()
  const { data: meal, error: mealError } = await supabase
    .from('saved_meals')
    .select('id, name, kcal, protein_g, carbs_g, fat_g, use_count')
    .eq('id', mealId)
    .single()
  if (mealError) throw new Error(mealError.message)

  const { error } = await supabase.from('food_entries').insert({
    day: londonToday(),
    label: meal.name,
    kcal: meal.kcal,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
    meal_id: meal.id,
  })
  if (error) throw new Error(error.message)

  await supabase
    .from('saved_meals')
    .update({ use_count: meal.use_count + 1 })
    .eq('id', meal.id)

  revalidate()
}

export async function deleteFood(entryId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('food_entries').delete().eq('id', entryId)
  if (error) throw new Error(error.message)
  revalidate()
}

export async function deleteSavedMeal(mealId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('saved_meals').delete().eq('id', mealId)
  if (error) throw new Error(error.message)
  revalidate()
}

/** Set today's day type; the calorie target follows the band for it. */
export async function setDayType(type: DayType) {
  const supabase = await createClient()
  const today = londonToday()
  await getOrCreateDayLog(supabase, today)
  const { data: settings } = await supabase.from('settings').select('kcal_bands').eq('id', 1).single()
  const band = resolveBands(settings?.kcal_bands).find(b => b.key === type)
  if (!band) throw new Error('Unknown day type')
  const { error } = await supabase
    .from('day_log')
    .update({ day_type: band.key, kcal_target: band.kcal })
    .eq('day', today)
  if (error) throw new Error(error.message)
  revalidate()
}
