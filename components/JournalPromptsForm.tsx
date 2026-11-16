'use client'

import { useState, useTransition } from 'react'
import { updateJournalPrompts } from '@/app/settings/actions'
import { cleanPrompts } from '@/lib/closeout'

export default function JournalPromptsForm({ current }: { current: string[] }) {
  const [prompts, setPrompts] = useState([0, 1, 2].map(i => current[i] ?? ''))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaved(false)
    const cleaned = cleanPrompts(prompts)
    if (!cleaned.ok) {
      setError(cleaned.error)
      return
    }
    setError('')
    startTransition(async () => {
      try {
        await updateJournalPrompts(cleaned.prompts)
        setSaved(true)
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {prompts.map((prompt, i) => (
        <input
          key={i}
          type="text"
          value={prompt}
          onChange={e => {
            setSaved(false)
            setPrompts(prev => prev.map((p, j) => (j === i ? e.target.value : p)))
          }}
          maxLength={120}
          placeholder={`Prompt ${i + 1}`}
          aria-label={`Journal prompt ${i + 1}`}
          className="w-full bg-sunk text-ink px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-line-strong"
        />
      ))}
      <div className="flex items-center gap-3 pt-1">
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
