import type { FoodEntry } from '@/lib/types'

export type FoodInput =
  | { ok: true; label: string; kcal: number; protein_g: number }
  | { ok: false; error: string }

/** Plain digits with an optional decimal part: no signs, commas or exponents. */
const PLAIN_NUMBER = /^\d+(\.\d+)?$/

/** Validate a food entry as typed. Blank protein counts as zero. */
export function parseFoodInput(raw: { label: string; kcal: string; protein: string }): FoodInput {
  const label = raw.label.trim().slice(0, 120)
  if (label === '') return { ok: false, error: 'Give it a name' }

  const kcalText = raw.kcal.trim()
  const kcal = Math.round(Number(kcalText))
  if (!PLAIN_NUMBER.test(kcalText) || kcal > 5000) {
    return { ok: false, error: 'Calories must be a number from 0 to 5,000' }
  }

  const proteinText = raw.protein.trim()
  const protein_g = proteinText === '' ? 0 : Math.round(Number(proteinText))
  if (proteinText !== '' && (!PLAIN_NUMBER.test(proteinText) || protein_g > 400)) {
    return { ok: false, error: 'Protein must be a number from 0 to 400' }
  }

  return { ok: true, label, kcal, protein_g }
}

export function dayTotals(entries: Pick<FoodEntry, 'kcal' | 'protein_g'>[]): {
  kcal: number
  protein_g: number
} {
  return entries.reduce(
    (total, e) => ({ kcal: total.kcal + e.kcal, protein_g: total.protein_g + e.protein_g }),
    { kcal: 0, protein_g: 0 }
  )
}
