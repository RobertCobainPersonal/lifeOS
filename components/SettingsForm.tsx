'use client'

import { useState, useTransition } from 'react'
import { updateSlippingDays } from '@/app/settings/actions'

interface SettingsFormProps {
  currentDays: number
}

export default function SettingsForm({ currentDays }: SettingsFormProps) {
  const [days, setDays] = useState(currentDays)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaved(false)
    setError('')
    startTransition(async () => {
      try {
        await updateSlippingDays(days)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1">
        <input
          type="number"
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          min={1}
          max={90}
          className="w-16 bg-gray-800 text-white text-center px-2 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-600"
        />
        <span className="text-gray-400 text-sm">days</span>
      </div>
      <button
        type="submit"
        disabled={isPending || days === currentDays}
        className="px-4 py-2 bg-blue-600 active:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
      >
        {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  )
}
