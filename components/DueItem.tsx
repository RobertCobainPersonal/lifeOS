'use client'

import { useState, useTransition } from 'react'
import { completeTask, addToTop3 } from '@/app/tasks/actions'

interface DueItemProps {
  id: string
  title: string
  energy: string | null
  top3Count: number
}

export default function DueItem({ id, title, energy, top3Count }: DueItemProps) {
  const [done, setDone] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [pinError, setPinError] = useState('')
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

  function handlePin() {
    if (top3Count >= 3) {
      setPinError('Top 3 is full')
      setTimeout(() => setPinError(''), 2000)
      return
    }
    setPinned(true)
    setPinError('')
    startTransition(async () => {
      try {
        await addToTop3(id)
      } catch (e) {
        setPinned(false)
        setPinError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  if (done || pinned) return null

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="w-6 h-6 shrink-0 rounded-full border-2 border-gray-600 active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
        aria-label={`Complete "${title}"`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm leading-snug">{title}</p>
        {pinError && <p className="text-red-400 text-xs mt-0.5">{pinError}</p>}
      </div>
      {energy && (
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
          energy === 'deep'
            ? 'bg-purple-900/60 text-purple-300'
            : 'bg-gray-800 text-gray-400'
        }`}>
          {energy}
        </span>
      )}
      <button
        onClick={handlePin}
        disabled={isPending}
        className="text-gray-600 active:text-yellow-400 text-lg shrink-0 disabled:opacity-40 transition-colors"
        aria-label={`Add "${title}" to Top 3`}
      >
        ☆
      </button>
    </div>
  )
}
