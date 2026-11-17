'use client'

import { useState, useTransition } from 'react'
import { addHabit, removeHabit } from '@/app/habits/actions'
import { MAX_HABITS, parseHabitName, type Habit } from '@/lib/habits'

export default function HabitsForm({ habits }: { habits: Habit[] }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const parsed = parseHabitName(name, habits.map(h => h.name))
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await addHabit(name)
        if (result.error) {
          setError(result.error)
          return
        }
        setName('')
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <div>
      {habits.map(h => (
        <div key={h.id} className="flex items-center justify-between py-2.5 border-b border-line">
          <span className="text-ink-soft text-sm">{h.name}</span>
          <button
            onClick={() =>
              startTransition(async () => {
                try {
                  await removeHabit(h.id)
                } catch {
                  setError('Could not save — try again')
                }
              })
            }
            disabled={isPending}
            className="text-muted text-xs active:text-ink-soft disabled:opacity-40 px-2 py-1"
          >
            Remove
          </button>
        </div>
      ))}
      {habits.length < MAX_HABITS && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-3" noValidate>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Add one, e.g. Stretch"
            aria-label="New non-negotiable"
            maxLength={60}
            autoComplete="off"
            className="flex-1 bg-sunk text-ink px-3 py-2 rounded-lg text-sm placeholder-faint focus:outline-none focus:ring-1 focus:ring-line-strong"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-accent active:bg-accent-strong text-white text-sm font-medium rounded-lg disabled:opacity-40"
          >
            Add
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-red-700 text-xs mt-2">
          {error}
        </p>
      )}
    </div>
  )
}
