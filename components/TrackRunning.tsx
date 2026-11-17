'use client'

import { useState, useTransition } from 'react'
import { stopEntry } from '@/app/time/actions'
import { elapsedSeconds, formatClock } from '@/lib/time'
import type { TimeEntry } from '@/lib/types'
import { useNow } from '@/components/useNow'

export default function TrackRunning({
  entry,
  name,
  serverNowMs,
}: {
  entry: TimeEntry
  /** e.g. "Hockey · Playing" */
  name: string
  serverNowMs: number
}) {
  const now = useNow(serverNowMs)
  const [failed, setFailed] = useState(false)
  const [isPending, startTransition] = useTransition()

  function stop() {
    setFailed(false)
    startTransition(async () => {
      try {
        await stopEntry()
      } catch {
        setFailed(true)
      }
    })
  }

  return (
    <div className="bg-card ring-1 ring-line rounded-xl p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted">Tracking</p>
        <p className="text-ink font-semibold truncate">
          {name}
          {entry.label ? <span className="text-muted font-normal"> · {entry.label}</span> : null}
        </p>
        <p className="text-2xl font-bold tabular-nums mt-1" role="timer">
          {formatClock(elapsedSeconds(entry, now))}
        </p>
        {failed && (
          <p role="alert" className="text-red-700 text-xs mt-1">
            Could not stop — try again
          </p>
        )}
      </div>
      <button
        onClick={stop}
        disabled={isPending}
        className="shrink-0 px-5 py-3 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40"
      >
        Stop
      </button>
    </div>
  )
}
