'use client'

import { useState, useTransition } from 'react'
import { createProject } from '@/app/projects/actions'

export default function NewProjectForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (name.trim() === '') {
      setError('Give the project a name')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await createProject(name)
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
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="New project"
          aria-label="New project name"
          maxLength={80}
          autoComplete="off"
          className="flex-1 bg-card ring-1 ring-line rounded-xl px-4 py-3 text-ink placeholder-faint text-base focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 bg-sunk active:bg-line-strong text-ink text-sm font-medium rounded-xl disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700 text-sm mt-2">
          {error}
        </p>
      )}
    </form>
  )
}
