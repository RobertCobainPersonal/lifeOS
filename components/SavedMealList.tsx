'use client'

import { useState, useTransition } from 'react'
import { deleteSavedMeal, logSavedMeal } from '@/app/fuel/actions'
import type { SavedMeal } from '@/lib/types'

/** Saved meals as large tap targets: one tap logs the meal for today. */
export default function SavedMealList({ meals }: { meals: SavedMeal[] }) {
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
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved meals</h2>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-gray-500 active:text-gray-300"
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
                ? 'bg-gray-900 border border-red-900/60 active:bg-red-950/40'
                : 'bg-gray-900 active:bg-gray-800'
            }`}
          >
            <p className="text-white text-sm font-medium leading-snug">{meal.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {editing
                ? 'Tap to remove'
                : `${meal.kcal} kcal · ${meal.protein_g} g${justLogged === meal.id ? ' · logged ✓' : ''}`}
            </p>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-400 text-sm mt-2">
          {error}
        </p>
      )}
    </section>
  )
}
