import type { FoodEntry } from '@/lib/types'

export type FoodInput =
  | { ok: true; label: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  | { ok: false; error: string }

/** Plain digits with an optional decimal part: no signs, commas or exponents. */
const PLAIN_NUMBER = /^\d+(\.\d+)?$/

/** A blank optional gram field is zero; anything else must be a plain number up to max. */
function grams(text: string | undefined, max: number): number | null {
  const t = (text ?? '').trim()
  if (t === '') return 0
  const n = Math.round(Number(t))
  return PLAIN_NUMBER.test(t) && n <= max ? n : null
}

/** Validate a food entry as typed. Blank protein, carbs and fat count as zero. */
export function parseFoodInput(raw: {
  label: string
  kcal: string
  protein: string
  carbs?: string
  fat?: string
}): FoodInput {
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

  const carbs_g = grams(raw.carbs, 600)
  if (carbs_g === null) return { ok: false, error: 'Carbs must be a number from 0 to 600' }
  const fat_g = grams(raw.fat, 300)
  if (fat_g === null) return { ok: false, error: 'Fat must be a number from 0 to 300' }

  return { ok: true, label, kcal, protein_g, carbs_g, fat_g }
}

export interface Totals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export function dayTotals(
  entries: (Pick<FoodEntry, 'kcal' | 'protein_g'> & { carbs_g?: number | null; fat_g?: number | null })[]
): Totals {
  return entries.reduce<Totals>(
    (total, e) => ({
      kcal: total.kcal + e.kcal,
      protein_g: total.protein_g + e.protein_g,
      carbs_g: total.carbs_g + (e.carbs_g ?? 0),
      fat_g: total.fat_g + (e.fat_g ?? 0),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}

export type DayType = 'rest' | 'light' | 'training' | 'long'

export interface Band {
  key: DayType
  label: string
  kcal: number
}

/** Baseline calorie targets by day type. Editable in Settings. */
export const DEFAULT_BANDS: Band[] = [
  { key: 'rest', label: 'Rest day', kcal: 1800 },
  { key: 'light', label: 'Light day', kcal: 2200 },
  { key: 'training', label: 'Training day', kcal: 2500 },
  { key: 'long', label: 'Long run day', kcal: 2900 },
]

const validKcal = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 1000 && n <= 5000

/** The bands in use: stored figures where sensible, the baseline otherwise. */
export function resolveBands(stored: unknown): Band[] {
  const s = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {}
  return DEFAULT_BANDS.map(b => ({ ...b, kcal: validKcal(s[b.key]) ? Math.round(s[b.key] as number) : b.kcal }))
}

export function cleanBands(
  input: Record<DayType, string>
): { ok: true; bands: Record<DayType, number> } | { ok: false; error: string } {
  const bands = {} as Record<DayType, number>
  for (const b of DEFAULT_BANDS) {
    const text = (input[b.key] ?? '').trim()
    const n = Math.round(Number(text))
    if (!PLAIN_NUMBER.test(text) || !validKcal(n)) {
      return { ok: false, error: `${b.label} must be between 1,000 and 5,000` }
    }
    bands[b.key] = n
  }
  return { ok: true, bands }
}
