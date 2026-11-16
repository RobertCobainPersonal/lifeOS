'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { londonToday } from '@/lib/dates'
import { parseFoodInput } from '@/lib/fuel'

function revalidate() {
  revalidatePath('/fuel')
  revalidatePath('/today')
  revalidatePath('/today/close')
}

export async function addFood(input: {
  label: string
  kcal: string
  protein: string
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
        { name: parsed.label, kcal: parsed.kcal, protein_g: parsed.protein_g },
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
    .select('id, name, kcal, protein_g, use_count')
    .eq('id', mealId)
    .single()
  if (mealError) throw new Error(mealError.message)

  const { error } = await supabase.from('food_entries').insert({
    day: londonToday(),
    label: meal.name,
    kcal: meal.kcal,
    protein_g: meal.protein_g,
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
