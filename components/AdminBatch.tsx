'use client'

import { useState, useTransition } from 'react'
import { completeTask } from '@/app/tasks/actions'

interface AdminTask {
  id: string
  title: string
  due_date: string | null
}

interface AdminBatchProps {
  tasks: AdminTask[]
}

export default function AdminBatch({ tasks }: AdminBatchProps) {
  const [expanded, setExpanded] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  function handleComplete(id: string) {
    setCompletedIds(prev => new Set([...prev, id]))
    startTransition(async () => {
      try {
        await completeTask(id)
      } catch {
        setCompletedIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    })
  }

  const visible = tasks.filter(t => !completedIds.has(t.id))

  if (visible.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 rounded-xl active:bg-gray-800 transition-colors"
      >
        <span className="text-gray-400 text-sm font-medium">
          Admin · {visible.length} task{visible.length !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-600 text-xs">{expanded ? 'Collapse ↑' : 'Expand ↓'}</span>
      </button>

      {expanded && (
        <div className="mt-1 bg-gray-900 rounded-xl px-4">
          {visible.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0"
            >
              <button
                onClick={() => handleComplete(task.id)}
                disabled={isPending}
                className="w-5 h-5 shrink-0 rounded-full border-2 border-gray-600 active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
                aria-label={`Complete "${task.title}"`}
              />
              <p className="flex-1 text-gray-300 text-sm leading-snug">{task.title}</p>
              {task.due_date && (
                <span className="text-xs text-gray-600 shrink-0">{task.due_date}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
