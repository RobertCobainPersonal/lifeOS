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
    <div className="bg-gray-900 rounded-xl p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">Tracking</p>
        <p className="text-white font-semibold truncate">
          {CATEGORIES[entry.category].label}
          {entry.label ? <span className="text-gray-400 font-normal"> · {entry.label}</span> : null}
        </p>
        <p className="text-2xl font-bold tabular-nums mt-1" role="timer">
          {formatClock(elapsedSeconds(entry, now))}
        </p>
      </div>
      <button
        onClick={() => startTransition(() => stopEntry())}
        disabled={isPending}
        className="shrink-0 px-5 py-3 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-40"
      >
        Stop
      </button>
    </div>
  )
}
