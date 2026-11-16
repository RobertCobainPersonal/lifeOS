'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { stopEntry } from '@/app/time/actions'
import { CATEGORIES, elapsedSeconds, formatClock, isOverrun, remainingSeconds } from '@/lib/time'
import type { TimeEntry } from '@/lib/types'
import { useNow } from '@/components/useNow'

interface NowRowProps {
  entry: TimeEntry | null
  serverNowMs: number
}

/** What is running right now, with Stop; or a quiet link to start tracking. */
export default function NowRow({ entry, serverNowMs }: NowRowProps) {
  const now = useNow(serverNowMs)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  function stop() {
    setError(false)
    startTransition(async () => {
      try {
        await stopEntry()
      } catch {
        setError(true)
      }
    })
  }

  if (!entry) {
    return (
      <Link
        href="/time"
        className="mb-6 flex items-center justify-between bg-card ring-1 ring-line rounded-xl px-4 py-3 active:bg-sunk"
      >
        <span className="text-muted text-sm font-medium">Track time</span>
        <span className="text-faint text-sm">→</span>
      </Link>
    )
  }

  const isFocus = entry.mode === 'focus'
  const name = isFocus ? entry.label ?? 'Focus' : CATEGORIES[entry.category].label
  // A focus session that ran out and was never ended can be closed straight from Home
  const overrun = isOverrun(entry, now)
  const clock = overrun
    ? `finished · ${formatClock(elapsedSeconds(entry, now))}`
    : isFocus
    ? `${formatClock(remainingSeconds(entry, now))} left`
    : formatClock(elapsedSeconds(entry, now))

  return (
    <div className="mb-6 flex items-center gap-3 bg-accent-soft border border-accent/30 rounded-xl px-4 py-3">
      <Link href="/time" className="flex-1 min-w-0">
        <p className="text-xs text-accent-ink">{isFocus ? 'Focusing' : 'Now'}</p>
        <p className="text-ink text-sm font-medium truncate">
          {name} · <span className="tabular-nums">{clock}</span>
          {entry.paused_at ? ' · paused' : ''}
        </p>
        {error && (
          <p role="alert" className="text-red-700 text-xs mt-0.5">
            Could not stop — try again
          </p>
        )}
      </Link>
      {isFocus && !overrun ? (
        <Link
          href="/time"
          className="shrink-0 px-3 py-2 bg-sunk active:bg-line-strong text-ink text-sm font-medium rounded-lg"
        >
          Open
        </Link>
      ) : (
        <button
          onClick={stop}
          disabled={isPending}
          className="shrink-0 px-3 py-2 bg-sunk active:bg-line-strong text-ink text-sm font-medium rounded-lg disabled:opacity-40"
        >
          {overrun ? 'End' : 'Stop'}
        </button>
      )}
    </div>
  )
}
