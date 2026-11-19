'use client'

import { useState, useTransition } from 'react'
import { addDone, removeDone } from '@/app/done/actions'
import { splitDone, type DoneEntry } from '@/lib/done'

interface DoneListProps {
  items: Pick<DoneEntry, 'id' | 'text'>[]
  /** Day new items are filed under; omit for today. */
  day?: string
  /** Shown above the list when there are no items. */
  emptyHint?: string
}

/** What got done on one day: add (a pasted list becomes one line each) and remove. */
export default function DoneList({ items, day, emptyHint = 'Nothing logged yet.' }: DoneListProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (splitDone(text).length === 0) return
    setError('')
    startTransition(async () => {
      try {
        const result = await addDone(text, day)
        if (result.error) {
          setError(result.error)
          return
        }
        setText('')
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await removeDone(id)
      } catch {
        setError('Could not remove — try again')
      }
    })
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-faint text-sm pb-2">{emptyHint}</p>
      ) : (
        <ul className="pb-2">
          {items.map(item => (
            <li key={item.id} className="group flex items-start gap-2 py-1.5 text-sm">
              <span aria-hidden="true" className="text-accent mt-px">
                ✓
              </span>
              <span className="flex-1 min-w-0 text-ink-soft break-words">{item.text}</span>
              <button
                onClick={() => remove(item.id)}
                disabled={isPending}
                aria-label={`Remove: ${item.text}`}
                className="text-faint text-xs px-1.5 py-0.5 active:text-ink-soft disabled:opacity-40"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Add something you got done">
        <input
          type="text"
          value={text}
          onChange={e => {
            setText(e.target.value)
            if (error) setError('')
          }}
          placeholder="Got something done?"
          aria-label="Something you got done"
          maxLength={500}
          autoComplete="off"
          className="flex-1 min-w-0 bg-sunk rounded-lg px-3 py-2 text-ink text-sm placeholder-faint focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isPending || text.trim() === ''}
          className="px-3 py-2 bg-accent text-white text-sm rounded-lg disabled:opacity-40"
        >
          Add
        </button>
      </form>
      {error && (
        <p role="alert" className="text-red-700 text-xs mt-2">
          {error}
        </p>
      )}
    </div>
  )
}
