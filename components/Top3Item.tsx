'use client'

import { useState, useTransition } from 'react'
import { completeTask, removeFromTop3 } from '@/app/tasks/actions'

interface Top3ItemProps {
  id: string
  title: string
  energy: string | null
  dueDate: string | null
}

export default function Top3Item({ id, title, energy, dueDate }: Top3ItemProps) {
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

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = dueDate && dueDate < today

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-2 flex items-start gap-3">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="mt-0.5 w-7 h-7 shrink-0 rounded-full border-2 border-gray-500 active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
        aria-label={`Complete "${title}"`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-base font-medium leading-snug">{title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {energy && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              energy === 'deep'
                ? 'bg-purple-900/60 text-purple-300'
                : 'bg-gray-800 text-gray-400'
            }`}>
              {energy}
            </span>
          )}
          {dueDate && (
            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
              {isOverdue ? 'overdue · ' : ''}{dueDate}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="text-yellow-500 active:text-gray-500 text-xl shrink-0 disabled:opacity-40 transition-colors"
        aria-label={`Remove "${title}" from Top 3`}
      >
        ★
      </button>
    </div>
  )
}
