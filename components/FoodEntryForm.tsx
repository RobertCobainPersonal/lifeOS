'use client'

import { useState, useTransition } from 'react'
import { addFood } from '@/app/fuel/actions'
import { parseFoodInput } from '@/lib/fuel'

export default function FoodEntryForm() {
  const [label, setLabel] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [saveAsMeal, setSaveAsMeal] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const parsed = parseFoodInput({ label, kcal, protein })
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await addFood({ label, kcal, protein, saveAsMeal })
        if (result.error) {
          setError(result.error)
          return
        }
        setLabel('')
        setKcal('')
        setProtein('')
        setSaveAsMeal(false)
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  const field =
    'bg-card ring-1 ring-line rounded-xl px-4 py-3 text-ink placeholder-faint text-base focus:outline-none focus:ring-1 focus:ring-accent'

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="What did you eat?"
        aria-label="Food"
        maxLength={120}
        autoComplete="off"
        className={`w-full ${field}`}
      />
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={kcal}
          onChange={e => setKcal(e.target.value)}
          placeholder="kcal"
          aria-label="Calories"
          className={`flex-1 min-w-0 ${field}`}
        />
        <input
          type="text"
          inputMode="numeric"
          value={protein}
          onChange={e => setProtein(e.target.value)}
          placeholder="protein g"
          aria-label="Protein in grams"
          className={`flex-1 min-w-0 ${field}`}
        />
      </div>
      <label className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          checked={saveAsMeal}
          onChange={e => setSaveAsMeal(e.target.checked)}
          className="w-5 h-5"
        />
        <span className="text-ink-soft text-sm">Save as a meal for one-tap logging</span>
      </label>
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Log it'}
      </button>
    </form>
  )
}
