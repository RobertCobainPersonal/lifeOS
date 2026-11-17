'use client'

import { useState, useTransition } from 'react'
import { updateBands } from '@/app/settings/actions'
import { cleanBands, type Band, type DayType } from '@/lib/fuel'

/** Calorie target for each day type. */
export default function BandsForm({ bands }: { bands: Band[] }) {
  const [values, setValues] = useState(
    Object.fromEntries(bands.map(b => [b.key, String(b.kcal)])) as Record<DayType, string>
  )
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaved(false)
    const cleaned = cleanBands(values)
    if (!cleaned.ok) {
      setError(cleaned.error)
      return
    }
    setError('')
    startTransition(async () => {
      try {
        await updateBands(values)
        setSaved(true)
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      {bands.map(b => (
        <label key={b.key} className="flex items-center justify-between gap-3">
          <span className="text-ink-soft text-sm">{b.label}</span>
          <span className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={values[b.key]}
              onChange={e => {
                setSaved(false)
                setValues(prev => ({ ...prev, [b.key]: e.target.value }))
              }}
              className="w-24 bg-sunk text-ink text-center px-2 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-line-strong"
            />
            <span className="text-muted text-sm">kcal</span>
          </span>
        </label>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-accent active:bg-accent-strong text-white text-sm font-medium rounded-lg disabled:opacity-40"
        >
          {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
        {error && (
          <p role="alert" className="text-red-700 text-xs">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
