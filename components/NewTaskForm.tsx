'use client'

import { useState, useTransition } from 'react'
import { createTask } from '@/app/tasks/actions'
import { parseNewTask } from '@/lib/tasks'

type Domain = 'work' | 'personal'
type Energy = '' | 'deep' | 'admin'

/** A collapsed "New task" row that opens into a short form. */
export default function NewTaskForm({ offerTop3 = true }: { offerTop3?: boolean }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<Domain>('work')
  const [energy, setEnergy] = useState<Energy>('')
  const [dueDate, setDueDate] = useState('')
  const [top3, setTop3] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle('')
    setEnergy('')
    setDueDate('')
    setTop3(false)
  }

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setNote('')
    const parsed = parseNewTask({ title, domain, energy, dueDate })
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await createTask({ title, domain, energy, dueDate, top3 })
        if (result.error) {
          setError(result.error)
          return
        }
        setNote(result.top3Full ? 'Added. Top 3 was full, so it went to Tasks.' : 'Added.')
        reset()
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 w-full flex items-center justify-between bg-card ring-1 ring-line rounded-xl px-4 py-3 active:bg-sunk"
      >
        <span className="text-ink-soft text-sm font-medium">+ New task</span>
        {note && <span className="text-faint text-xs">{note}</span>}
      </button>
    )
  }

  const pill = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-medium ${
      active ? 'bg-accent text-white' : 'bg-sunk text-muted active:bg-line'
    }`

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mb-6 bg-card ring-1 ring-line rounded-xl px-4 py-4 space-y-3"
      aria-label="New task"
    >
      <input
        type="text"
        value={title}
        onChange={e => {
          setTitle(e.target.value)
          if (error) setError('')
          if (note) setNote('')
        }}
        placeholder="What needs doing?"
        aria-label="Task"
        maxLength={200}
        autoComplete="off"
        autoFocus
        className="w-full bg-sunk rounded-lg px-3 py-3 text-ink placeholder-faint text-base focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <div className="flex gap-2" role="group" aria-label="Area">
        {(['work', 'personal'] as const).map(d => (
          <button key={d} type="button" onClick={() => setDomain(d)} aria-pressed={domain === d} className={pill(domain === d)}>
            {d === 'work' ? 'Work' : 'Personal'}
          </button>
        ))}
      </div>

      <div className="flex gap-2" role="group" aria-label="Energy">
        {(['deep', 'admin'] as const).map(en => (
          <button
            key={en}
            type="button"
            onClick={() => setEnergy(energy === en ? '' : en)}
            aria-pressed={energy === en}
            className={pill(energy === en)}
          >
            {en === 'deep' ? 'Deep work' : 'Admin'}
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-muted text-sm">Due (optional)</span>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="bg-sunk rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>

      {offerTop3 && (
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={top3} onChange={e => setTop3(e.target.checked)} className="w-5 h-5" />
          <span className="text-ink-soft text-sm">Add to today&rsquo;s Top 3</span>
        </label>
      )}

      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
      {note && <p className="text-accent-ink text-sm">{note}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-3 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40"
        >
          {isPending ? 'Adding…' : 'Add task'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError('')
            setNote('')
          }}
          className="px-4 py-3 text-muted text-sm active:text-ink-soft"
        >
          Close
        </button>
      </div>
    </form>
  )
}
