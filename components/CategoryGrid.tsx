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
          setError('A focus session is running. End it first.')
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
                ? 'bg-blue-600/20 border border-blue-600/50 text-blue-200'
                : 'bg-gray-900 text-gray-200 active:bg-gray-800'
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
        className="w-full bg-gray-900 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-base focus:outline-none focus:ring-1 focus:ring-blue-600"
      />

      <EnergyPicker value={energy} onChange={setEnergy} />

      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
