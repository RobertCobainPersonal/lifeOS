'use client'

import { useState, useTransition } from 'react'
import { completeTask, addToTop3, removeFromTop3 } from '@/app/tasks/actions'

interface TaskCardProps {
  id: string
  title: string
  domain: 'work' | 'personal' | null
  energy: 'deep' | 'admin' | null
  dueDate: string | null
  isTop3Today: boolean
  top3Count: number
}

export default function TaskCard({
  id,
  title,
  energy,
  dueDate,
  isTop3Today,
  top3Count,
}: TaskCardProps) {
  const [done, setDone] = useState(false)
  const [top3, setTop3] = useState(isTop3Today)
  const [top3Error, setTop3Error] = useState('')
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

  function handleTop3() {
    setTop3Error('')
    if (top3) {
      setTop3(false)
      startTransition(async () => {
        try {
          await removeFromTop3(id)
        } catch {
          setTop3(true)
        }
      })
    } else {
      if (top3Count >= 3) {
        setTop3Error('Top 3 is full — remove one first')
        setTimeout(() => setTop3Error(''), 2500)
        return
      }
      setTop3(true)
      startTransition(async () => {
        try {
          await addToTop3(id)
        } catch (e) {
          setTop3(false)
          setTop3Error(e instanceof Error ? e.message : 'Failed')
        }
      })
    }
  }

  if (done) return null

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = dueDate && dueDate < today

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-800 last:border-0">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 border-gray-600 active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
        aria-label={`Mark "${title}" complete`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-base leading-snug">{title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {energy && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                energy === 'deep'
                  ? 'bg-purple-900/60 text-purple-300'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {energy}
            </span>
          )}
          {dueDate && (
            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
              {isOverdue ? 'overdue · ' : ''}
              {dueDate}
            </span>
          )}
          {top3Error && <span className="text-red-400 text-xs">{top3Error}</span>}
        </div>
      </div>
      <button
        onClick={handleTop3}
        disabled={isPending}
        className={`text-xl shrink-0 disabled:opacity-40 transition-colors mt-0.5 ${
          top3 ? 'text-yellow-400 active:text-gray-500' : 'text-gray-600 active:text-yellow-400'
        }`}
        aria-label={top3 ? `Remove "${title}" from Top 3` : `Add "${title}" to Top 3`}
      >
        {top3 ? '★' : '☆'}
      </button>
    </div>
  )
}
