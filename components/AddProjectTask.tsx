'use client'

import { useState, useTransition } from 'react'
import { addProjectTask } from '@/app/projects/actions'
import { BANDS, BAND_LABEL, type Band } from '@/lib/projects'

export default function AddProjectTask({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('')
  const [band, setBandChoice] = useState<Band>('next')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (title.trim() === '') {
      setError('Give the task a name')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await addProjectTask(projectId, title, band)
        if (result.error) {
          setError(result.error)
          return
        }
        setTitle('')
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Add a task to this project"
        aria-label="New project task"
        maxLength={200}
        autoComplete="off"
        className="w-full bg-gray-900 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-base focus:outline-none focus:ring-1 focus:ring-blue-600"
      />
      <div className="flex gap-2">
        <div className="flex flex-1 gap-1" role="group" aria-label="List">
          {BANDS.map(b => (
            <button
              key={b}
              type="button"
              onClick={() => setBandChoice(b)}
              aria-pressed={band === b}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                band === b ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 active:bg-gray-800'
              }`}
            >
              {BAND_LABEL[b]}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 bg-gray-800 active:bg-gray-700 text-white text-sm font-medium rounded-lg disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}
    </form>
  )
}
