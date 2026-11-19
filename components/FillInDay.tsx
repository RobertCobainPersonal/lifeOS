'use client'

import { useState, useTransition } from 'react'
import { addDone } from '@/app/done/actions'
import { splitDone } from '@/lib/done'

/** Add to any day in the last 30, for a day you never opened the app. One line per item. */
export default function FillInDay({ today, earliest }: { today: string; earliest: string }) {
  const [day, setDay] = useState(today)
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const count = splitDone(text).length

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (count === 0) return
    setMessage('')
    startTransition(async () => {
      try {
        const result = await addDone(text, day)
        if (result.error) {
          setMessage(result.error)
          return
        }
        setText('')
        setMessage(`Added ${count}`)
      } catch {
        setMessage('Could not save — try again')
      }
    })
  }

  const field =
    'bg-sunk rounded-lg px-3 py-2 text-ink text-sm placeholder-faint focus:outline-none focus:ring-1 focus:ring-accent'

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Fill in a day">
      <input
        type="date"
        value={day}
        min={earliest}
        max={today}
        onChange={e => setDay(e.target.value)}
        aria-label="Day"
        className={`w-full ${field}`}
      />
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder={'One per line, e.g.\nSent the DACH coverage summary\nFixed the Magnus import'}
        aria-label="What you got done, one per line"
        className={`w-full text-base ${field}`}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || count === 0}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg disabled:opacity-40"
        >
          {count > 1 ? `Add ${count}` : 'Add'}
        </button>
        {message && (
          <p role="status" className="text-muted text-sm">
            {message}
          </p>
        )}
      </div>
    </form>
  )
}
