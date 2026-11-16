'use client'

import { londonToday } from '@/lib/dates'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { completeTask, removeFromTop3 } from '@/app/tasks/actions'

interface Top3ItemProps {
  id: string
  title: string
  energy: string | null
  dueDate: string | null
  /** Opens the focus form for this task; omitted while a session is running. */
  focusHref?: string | null
}

export default function Top3Item({ id, title, energy, dueDate, focusHref }: Top3ItemProps) {
  const [done, setDone] = useState(false)
  const [removed, setRemoved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleComplete() {
    setDone(true)
    startTransition(async () => {
      try {
        await completeTask(id)
      } catch {
        setDone(false)
      }
    })
  }

  function handleRemove() {
    setRemoved(true)
    startTransition(async () => {
      try {
        await removeFromTop3(id)
      } catch {
        setRemoved(false)
      }
    })
  }

  if (done || removed) return null

  const today = londonToday()
  const isOverdue = dueDate && dueDate < today

  return (
    <div className="bg-card ring-1 ring-line rounded-xl p-4 mb-2 flex items-start gap-3">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="mt-0.5 w-7 h-7 shrink-0 rounded-full border-2 border-faint active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
        aria-label={`Complete "${title}"`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-ink text-base font-medium leading-snug">{title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {energy && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              energy === 'deep'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-sunk text-muted'
            }`}>
              {energy}
            </span>
          )}
          {dueDate && (
            <span className={`text-xs ${isOverdue ? 'text-red-700' : 'text-muted'}`}>
              {isOverdue ? 'overdue · ' : ''}{dueDate}
            </span>
          )}
        </div>
      </div>
      {focusHref && (
        <Link
          href={focusHref}
          className="shrink-0 px-2.5 py-1 text-xs font-medium text-accent-ink bg-accent-soft active:bg-accent/25 rounded-lg"
          aria-label={`Start focus on "${title}"`}
        >
          Focus
        </Link>
      )}
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="text-amber-600 active:text-muted text-xl shrink-0 disabled:opacity-40 transition-colors"
        aria-label={`Remove "${title}" from Top 3`}
      >
        ★
      </button>
    </div>
  )
}
