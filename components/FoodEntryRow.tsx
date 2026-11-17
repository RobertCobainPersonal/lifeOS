'use client'

import { useTransition } from 'react'
import { deleteFood } from '@/app/fuel/actions'

export default function FoodEntryRow({
  id,
  label,
  kcal,
  protein,
  macros = null,
}: {
  id: string
  label: string
  kcal: number
  protein: number
  /** Carbs and fat, shown when detailed nutrition is on. */
  macros?: { carbs: number; fat: number } | null
}) {
  const [isPending, startTransition] = useTransition()
  return (
    <div className="flex items-center gap-3 py-3 border-b border-line last:border-0">
      <p className="flex-1 text-ink-soft text-sm leading-snug">{label}</p>
      <span className="text-muted text-xs tabular-nums shrink-0">
        {kcal} kcal · {macros ? `P${protein} C${macros.carbs} F${macros.fat}` : `${protein} g`}
      </span>
      <button
        onClick={() => startTransition(() => deleteFood(id))}
        disabled={isPending}
        aria-label={`Remove ${label}`}
        className="shrink-0 w-8 h-8 text-faint active:text-ink-soft disabled:opacity-40"
      >
        ×
      </button>
    </div>
  )
}
