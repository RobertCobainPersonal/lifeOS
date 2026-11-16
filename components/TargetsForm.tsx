'use client'

import { useState, useTransition } from 'react'
import { updateTargets } from '@/app/settings/actions'
import { checkTargets } from '@/lib/closeout'

export default function TargetsForm({ kcal, protein }: { kcal: number; protein: number }) {
  const [kcalInput, setKcalInput] = useState(String(kcal))
  const [proteinInput, setProteinInput] = useState(String(protein))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaved(false)
    const checked = checkTargets(Number(kcalInput), Number(proteinInput))
    if (kcalInput.trim() === '' || proteinInput.trim() === '' || !checked.ok) {
      setError(checked.ok ? 'Enter both targets' : checked.error)
      return
    }
    setError('')
    startTransition(async () => {
      try {
        await updateTargets(checked.kcal, checked.protein)
        setSaved(true)
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  const field =
    'w-24 bg-gray-800 text-white text-center px-2 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-600'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={kcalInput}
            onChange={e => {
              setSaved(false)
              setKcalInput(e.target.value)
            }}
            className={field}
          />
          <span className="text-gray-400 text-sm">kcal</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={proteinInput}
            onChange={e => {
              setSaved(false)
              setProteinInput(e.target.value)
            }}
            className={field}
          />
          <span className="text-gray-400 text-sm">g protein</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 active:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40"
        >
          {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
        {error && (
          <p role="alert" className="text-red-400 text-xs">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
