'use client'

import { useState, useTransition } from 'react'
import { addPerson } from '@/app/people/actions'
import { CADENCES } from '@/lib/people'

export default function AddPersonForm() {
  const [name, setName] = useState('')
  const [cadence, setCadence] = useState('30')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (name.trim() === '') {
      setError('Add a name')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await addPerson({ name, cadence })
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
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Add someone"
        aria-label="Name"
        maxLength={80}
        autoComplete="off"
        className="w-full bg-card ring-1 ring-line rounded-xl px-4 py-3 text-ink placeholder-faint text-base focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex gap-2">
        <select
          value={cadence}
          onChange={e => setCadence(e.target.value)}
          aria-label="How often"
          className="flex-1 bg-card ring-1 ring-line rounded-xl px-3 py-3 text-ink text-base focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {CADENCES.map(c => (
            <option key={c.days} value={c.days}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 bg-accent active:bg-accent-strong text-white text-sm font-semibold rounded-xl disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
    </form>
  )
}
