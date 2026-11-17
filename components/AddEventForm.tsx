'use client'

import { useState, useTransition } from 'react'
import { addEvent } from '@/app/calendar/actions'
import { parseManualEvent } from '@/lib/calendar'

/** Title, date, times, optional location. Opens in place; closes after saving. */
export default function AddEventForm({ today, onDone }: { today: string; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(today)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const input = { title, day, start, end, allDay, location }
    const parsed = parseManualEvent(input)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await addEvent(input)
        if (result.error) {
          setError(result.error)
          return
        }
        onDone()
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  const field =
    'bg-sunk rounded-lg px-3 py-2 text-ink text-sm placeholder-faint focus:outline-none focus:ring-1 focus:ring-accent'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 pt-3 border-t border-line mt-3" aria-label="Add event">
      <input
        type="text"
        value={title}
        onChange={e => {
          setTitle(e.target.value)
          if (error) setError('')
        }}
        placeholder="What is it?"
        aria-label="Event"
        maxLength={200}
        autoComplete="off"
        autoFocus
        className={`w-full text-base py-3 ${field}`}
      />
      <input type="date" value={day} onChange={e => setDay(e.target.value)} aria-label="Date" className={`w-full ${field}`} />
      {!allDay && (
        <div className="flex items-center gap-2">
          <input type="time" value={start} onChange={e => setStart(e.target.value)} aria-label="Start" className={`flex-1 min-w-0 ${field}`} />
          <span className="text-faint text-sm">to</span>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} aria-label="End" className={`flex-1 min-w-0 ${field}`} />
        </div>
      )}
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="w-5 h-5" />
        <span className="text-ink-soft text-sm">All day</span>
      </label>
      <input
        type="text"
        value={location}
        onChange={e => setLocation(e.target.value)}
        placeholder="Where? (optional)"
        aria-label="Location"
        maxLength={200}
        autoComplete="off"
        className={`w-full ${field}`}
      />
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-accent active:bg-accent-strong text-white text-sm font-semibold rounded-lg disabled:opacity-40"
        >
          {isPending ? 'Adding…' : 'Add event'}
        </button>
        <button type="button" onClick={onDone} className="px-3 py-2.5 text-muted text-sm active:text-ink-soft">
          Cancel
        </button>
      </div>
      <p className="text-faint text-xs">No end time means one hour.</p>
    </form>
  )
}
