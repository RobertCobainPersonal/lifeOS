'use client'

import { useTransition } from 'react'
import { stopEntry } from '@/app/time/actions'
import { CATEGORIES, elapsedSeconds, formatClock } from '@/lib/time'
import type { TimeEntry } from '@/lib/types'
import { useNow } from '@/components/useNow'

export default function TrackRunning({ entry, serverNowMs }: { entry: TimeEntry; serverNowMs: number }) {
  const now = useNow(serverNowMs)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="bg-card ring-1 ring-line rounded-xl p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted">Tracking</p>
        <p className="text-ink font-semibold truncate">
          {CATEGORIES[entry.category].label}
          {entry.label ? <span className="text-muted font-normal"> · {entry.label}</span> : null}
        </p>
        <p className="text-2xl font-bold tabular-nums mt-1" role="timer">
          {formatClock(elapsedSeconds(entry, now))}
        </p>
      </div>
      <button
        onClick={() => startTransition(() => stopEntry())}
        disabled={isPending}
        className="shrink-0 px-5 py-3 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40"
      >
        Stop
      </button>
    </div>
  )
}
