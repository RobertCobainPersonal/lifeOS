'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { endFocus, logDistraction, togglePause } from '@/app/time/actions'
import { elapsedSeconds, formatClock, remainingSeconds } from '@/lib/time'
import type { TimeEntry } from '@/lib/types'
import { useNow } from '@/components/useNow'

interface FocusTimerProps {
  entry: TimeEntry
  serverNowMs: number
}

export default function FocusTimer({ entry, serverNowMs }: FocusTimerProps) {
  const now = useNow(serverNowMs)
  const router = useRouter()
  const [ending, setEnding] = useState(false)
  const [doneNote, setDoneNote] = useState('')
  const [nextNote, setNextNote] = useState('')
  const [completeTask, setCompleteTask] = useState(false)
  const [distractions, setDistractions] = useState(entry.distractions)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const elapsed = elapsedSeconds(entry, now)
  const remaining = remainingSeconds(entry, now)
  const paused = !!entry.paused_at
  const finished = remaining === 0

  function run(action: () => Promise<void>, onFail?: () => void) {
    setError('')
    startTransition(async () => {
      try {
        await action()
      } catch {
        onFail?.()
        setError('Could not save — try again')
      }
    })
  }

  if (ending) {
    return (
      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault()
          run(async () => {
            await endFocus(entry.id, doneNote, nextNote, completeTask)
            router.push('/today')
          })
        }}
      >
        <p className="text-gray-400 text-sm">
          {Math.round(elapsed / 60)} min on {entry.label}
        </p>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            What got done?
          </span>
          <textarea
            value={doneNote}
            onChange={e => setDoneNote(e.target.value)}
            rows={2}
            maxLength={500}
            className="mt-1 w-full bg-gray-900 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            What&rsquo;s next?
          </span>
          <textarea
            value={nextNote}
            onChange={e => setNextNote(e.target.value)}
            rows={2}
            maxLength={500}
            className="mt-1 w-full bg-gray-900 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <span className="text-xs text-gray-600">Saved to your inbox unless the task is done.</span>
        </label>
        {entry.task_id && (
          <label className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              checked={completeTask}
              onChange={e => setCompleteTask(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-gray-200 text-sm">Mark task done</span>
          </label>
        )}
        {error && (
          <p role="alert" className="text-red-400 text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-40"
        >
          End session
        </button>
        <button
          type="button"
          onClick={() => setEnding(false)}
          disabled={isPending}
          className="w-full py-2 text-gray-500 text-sm active:text-gray-300"
        >
          Back to timer
        </button>
      </form>
    )
  }

  return (
    <div className="text-center space-y-6">
      <div>
        <p className="text-gray-400 text-sm">{entry.label}</p>
        <p
          className="text-6xl font-bold tabular-nums mt-2"
          role="timer"
          aria-label={`${Math.ceil(remaining / 60)} minutes remaining`}
        >
          {formatClock(remaining)}
        </p>
        <p className="text-gray-600 text-sm mt-2">
          {paused
            ? 'On a break'
            : finished
            ? `Time's up · ${formatClock(elapsed)} worked`
            : `${formatClock(elapsed)} of ${entry.planned_minutes} min`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            setDistractions(d => d + 1)
            run(
              () => logDistraction(entry.id),
              () => setDistractions(d => d - 1)
            )
          }}
          disabled={paused}
          className="py-4 bg-gray-900 active:bg-gray-800 text-gray-200 font-medium rounded-xl disabled:opacity-40"
        >
          Distracted{distractions > 0 ? ` · ${distractions}` : ''}
        </button>
        <button
          onClick={() => run(() => togglePause(entry.id))}
          disabled={isPending}
          className="py-4 bg-gray-900 active:bg-gray-800 text-gray-200 font-medium rounded-xl disabled:opacity-40"
        >
          {paused ? 'Resume' : 'Break'}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}

      <button
        onClick={() => setEnding(true)}
        className="w-full py-3.5 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl"
      >
        End
      </button>
    </div>
  )
}
