'use client'

import { useState, useTransition } from 'react'
import {
  doTodaySlipping,
  rescheduleSlipping,
  someDaySlipping,
  deleteSlipping,
} from '@/app/slipping/actions'

interface SlippingCardProps {
  id: string
  title: string
  energy: string | null
  domain: string | null
  dueDate: string | null
  lastTouchedAt: string
}

export default function SlippingCard({
  id,
  title,
  energy,
  domain,
  dueDate,
  lastTouchedAt,
}: SlippingCardProps) {
  const [dismissed, setDismissed] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [isPending, startTransition] = useTransition()

  function act(fn: () => Promise<void>) {
    setDismissed(true)
    startTransition(async () => {
      try {
        await fn()
      } catch {
        setDismissed(false)
      }
    })
  }

  function handleReschedule(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!newDate) return
    act(() => rescheduleSlipping(id, newDate))
  }

  if (dismissed) return null

  const daysSince = Math.floor(
    (new Date().getTime() - new Date(lastTouchedAt).getTime()) / 86400000
  )

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-white text-base leading-snug flex-1">{title}</p>
        <span className="text-gray-600 text-xs shrink-0 mt-0.5">{daysSince}d ago</span>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {energy && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            energy === 'deep' ? 'bg-purple-900/60 text-purple-300' : 'bg-gray-800 text-gray-400'
          }`}>
            {energy}
          </span>
        )}
        {domain && (
          <span className="text-xs text-gray-600">{domain}</span>
        )}
        {dueDate && (
          <span className="text-xs text-red-400">was due {dueDate}</span>
        )}
      </div>

      {showReschedule ? (
        <form onSubmit={handleReschedule} className="flex gap-2">
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            autoFocus
            className="flex-1 bg-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ colorScheme: 'dark' }}
          />
          <button
            type="submit"
            disabled={!newDate || isPending}
            className="px-4 py-2 bg-blue-600 active:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-40 transition-colors"
          >
            Set
          </button>
          <button
            type="button"
            onClick={() => setShowReschedule(false)}
            disabled={isPending}
            className="px-3 py-2 bg-gray-800 text-gray-400 text-sm rounded-lg"
          >
            ✕
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => act(() => doTodaySlipping(id))}
            disabled={isPending}
            className="px-3 py-2 bg-blue-600 active:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
          >
            Do today
          </button>
          <button
            onClick={() => setShowReschedule(true)}
            disabled={isPending}
            className="px-3 py-2 bg-gray-800 active:bg-gray-700 text-gray-300 text-sm rounded-lg disabled:opacity-40 transition-colors"
          >
            Reschedule
          </button>
          <button
            onClick={() => act(() => someDaySlipping(id))}
            disabled={isPending}
            className="px-3 py-2 bg-gray-800 active:bg-gray-700 text-gray-300 text-sm rounded-lg disabled:opacity-40 transition-colors"
          >
            Someday
          </button>
          <button
            onClick={() => act(() => deleteSlipping(id))}
            disabled={isPending}
            className="px-3 py-2 bg-gray-800 active:bg-gray-700 text-red-500 text-sm rounded-lg disabled:opacity-40 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
