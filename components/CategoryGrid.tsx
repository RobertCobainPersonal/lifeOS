'use client'

import { useState, useTransition } from 'react'
import { startTrack } from '@/app/time/actions'
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/time'
import type { Category } from '@/lib/types'
import EnergyPicker from '@/components/EnergyPicker'

interface CategoryGridProps {
  /** Category currently running, shown as selected. */
  current?: Category | null
}

/** One tap on a category starts tracking it, ending whatever was being tracked. */
export default function CategoryGrid({ current = null }: CategoryGridProps) {
  const [label, setLabel] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function start(category: Category) {
    setError('')
    startTransition(async () => {
      try {
        const result = await startTrack({ category, label, energy })
        if ('error' in result) {
          setError(
            result.error === 'focus_running'
              ? 'A focus session is running. End it first.'
              : 'Something else just started. Try again.'
          )
          return
        }
        setLabel('')
        setEnergy(null)
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {CATEGORY_KEYS.map(key => (
          <button
            key={key}
            onClick={() => start(key)}
            disabled={isPending || key === current}
            aria-pressed={key === current}
            className={`min-h-[64px] px-2 py-3 rounded-xl text-sm font-medium leading-tight transition-colors disabled:opacity-60 ${
              key === current
                ? 'bg-accent-soft border border-accent/40 text-accent-ink'
                : 'bg-card ring-1 ring-line text-ink-soft active:bg-sunk'
            }`}
          >
            {CATEGORIES[key].label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="What is it? (optional)"
        maxLength={120}
        autoComplete="off"
        className="w-full bg-card ring-1 ring-line rounded-xl px-4 py-3 text-ink placeholder-faint text-base focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <EnergyPicker value={energy} onChange={setEnergy} />

      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
