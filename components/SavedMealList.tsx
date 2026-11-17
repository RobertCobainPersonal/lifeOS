'use client'

import { useState, useTransition } from 'react'
import { deleteSavedMeal, logSavedMeal } from '@/app/fuel/actions'
import type { SavedMeal } from '@/lib/types'

/** Saved meals as large tap targets: one tap logs the meal for today. */
export default function SavedMealList({ meals, detailed = false }: { meals: SavedMeal[]; detailed?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [justLogged, setJustLogged] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (meals.length === 0) return null

  function handleTap(meal: SavedMeal) {
    setError('')
    startTransition(async () => {
      try {
        if (editing) {
          await deleteSavedMeal(meal.id)
        } else {
          await logSavedMeal(meal.id)
          setJustLogged(meal.id)
        }
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Saved meals</h2>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-muted active:text-ink-soft"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {meals.map(meal => (
          <button
            key={meal.id}
            onClick={() => handleTap(meal)}
            disabled={isPending}
            className={`text-left px-3 py-3 rounded-xl transition-colors disabled:opacity-40 ${
              editing
                ? 'bg-card border border-red-300 active:bg-red-50'
                : 'bg-card ring-1 ring-line active:bg-sunk'
            }`}
          >
            <p className="text-ink text-sm font-medium leading-snug">{meal.name}</p>
            <p className="text-muted text-xs mt-0.5">
              {editing
                ? 'Tap to remove'
                : `${meal.kcal} kcal · ${
                    detailed ? `P${meal.protein_g} C${meal.carbs_g} F${meal.fat_g}` : `${meal.protein_g} g`
                  }${justLogged === meal.id ? ' · logged ✓' : ''}`}
            </p>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-700 text-sm mt-2">
          {error}
        </p>
      )}
    </section>
  )
}
