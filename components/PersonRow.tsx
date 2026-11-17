'use client'

import { useState, useTransition } from 'react'
import { markContacted, removePerson } from '@/app/people/actions'

interface PersonRowProps {
  id: string
  name: string
  rhythm: string
  since: string
  note: string | null
}

export default function PersonRow({ id, name, rhythm, since, note }: PersonRowProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<void>) {
    setError('')
    startTransition(async () => {
      try {
        await action()
        setOpen(false)
        setText('')
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <div className="py-3 border-b border-line last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-ink text-sm font-medium">{name}</p>
          <p className="text-muted text-xs mt-0.5">
            {rhythm} · last in touch: {since.toLowerCase()}
          </p>
          {note && <p className="text-faint text-xs mt-1 leading-snug">{note}</p>}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="shrink-0 px-3 py-1.5 bg-accent-soft text-accent-ink text-xs font-semibold rounded-lg active:bg-accent/25"
        >
          In touch
        </button>
      </div>

      {open && (
        <form
          className="mt-3 space-y-2"
          onSubmit={e => {
            e.preventDefault()
            run(() => markContacted(id, text))
          }}
        >
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Anything to remember for next time? (optional)"
            aria-label={`Note about ${name}`}
            maxLength={500}
            autoComplete="off"
            className="w-full bg-sunk text-ink px-3 py-2 rounded-lg text-sm placeholder-faint focus:outline-none focus:ring-1 focus:ring-line-strong"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-accent active:bg-accent-strong text-white text-sm font-medium rounded-lg disabled:opacity-40"
            >
              Spoke today
            </button>
            <button
              type="button"
              onClick={() => run(() => removePerson(id))}
              disabled={isPending}
              className="text-muted text-xs active:text-ink-soft disabled:opacity-40"
            >
              Remove from list
            </button>
          </div>
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
