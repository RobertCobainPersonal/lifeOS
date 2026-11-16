'use client'

import { londonToday } from '@/lib/dates'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { unpinClickUpFromTop3 } from '@/app/clickup/actions'

interface ClickupTop3ItemProps {
  clickupId: string
  title: string
  status: string | null
  dueDate: string | null
  url: string
  listName: string | null
  /** Opens the focus form for this item; omitted while a session is running. */
  focusHref?: string | null
}

export default function ClickupTop3Item({
  clickupId,
  title,
  status,
  dueDate,
  url,
  listName,
  focusHref,
}: ClickupTop3ItemProps) {
  const [removed, setRemoved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUnpin() {
    setRemoved(true)
    startTransition(async () => {
      try {
        await unpinClickUpFromTop3(clickupId)
      } catch {
        setRemoved(false)
      }
    })
  }

  if (removed) return null

  const today = londonToday()
  const isOverdue = dueDate && dueDate < today

  return (
    <div className="bg-card ring-1 ring-line rounded-xl p-4 mb-2 flex items-start gap-3">
      {/* No complete button — ClickUp tasks are read-only */}
      <div className="mt-1 w-7 h-7 shrink-0 rounded-full border-2 border-line-strong flex items-center justify-center">
        <span className="text-faint text-xs">CU</span>
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink text-base font-medium leading-snug hover:underline"
        >
          {title}
        </a>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {status && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-sunk text-muted">
              {status}
            </span>
          )}
          {listName && (
            <span className="text-xs text-faint">{listName}</span>
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
        onClick={handleUnpin}
        disabled={isPending}
        className="text-amber-600 active:text-muted text-xl shrink-0 disabled:opacity-40 transition-colors"
        aria-label={`Remove "${title}" from Top 3`}
      >
        ★
      </button>
    </div>
  )
}
