'use client'

import { useState, useTransition } from 'react'
import { confirmMorningPlan, dismissMorningPlan } from '@/app/today/actions'

interface PlanTask {
  id: string
  title: string
  energy: string | null
  domain: string | null
  category: 'yesterday' | 'deferred' | 'due_today'
}

interface MorningPlanProps {
  tasks: PlanTask[]
}

export default function MorningPlan({ tasks }: MorningPlanProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [closed, setClosed] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (closed) return null

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      return next
    })
  }

  function handleConfirm() {
    setClosed(true)
    startTransition(async () => {
      await confirmMorningPlan(Array.from(selected))
    })
  }

  function handleSkip() {
    setClosed(true)
    startTransition(async () => {
      await dismissMorningPlan()
    })
  }

  const yesterday = tasks.filter(t => t.category === 'yesterday')
  const deferred = tasks.filter(t => t.category === 'deferred')
  const dueToday = tasks.filter(t => t.category === 'due_today')

  return (
    <div className="fixed inset-0 z-[60] bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Morning Plan</h1>
        <button
          onClick={handleSkip}
          disabled={isPending}
          className="text-gray-500 text-sm active:text-gray-300 disabled:opacity-40 px-2 py-1"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <p className="text-gray-500 text-sm">
          Pick up to 3 tasks for today&rsquo;s Top 3.
          {selected.size === 3 && (
            <span className="text-blue-400"> Top 3 full.</span>
          )}
        </p>

        {tasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Nothing from yesterday or due today.</p>
            <p className="text-gray-700 text-sm mt-1">You&rsquo;re starting fresh.</p>
          </div>
        )}

        {yesterday.length > 0 && (
          <PlanGroup
            label="From yesterday"
            tasks={yesterday}
            selected={selected}
            onToggle={toggle}
            full={selected.size >= 3}
          />
        )}
        {deferred.length > 0 && (
          <PlanGroup
            label="Deferred"
            tasks={deferred}
            selected={selected}
            onToggle={toggle}
            full={selected.size >= 3}
          />
        )}
        {dueToday.length > 0 && (
          <PlanGroup
            label="Due today"
            tasks={dueToday}
            selected={selected}
            onToggle={toggle}
            full={selected.size >= 3}
          />
        )}
      </div>

      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 border-t border-gray-800 space-y-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full py-3.5 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-40 transition-colors"
        >
          {selected.size === 0 ? 'Start with empty Top 3' : `Set Top 3 (${selected.size})`}
        </button>
        <button
          onClick={handleSkip}
          disabled={isPending}
          className="w-full py-2 text-gray-600 text-sm active:text-gray-400 disabled:opacity-40"
        >
          Skip for today
        </button>
      </div>
    </div>
  )
}

function PlanGroup({
  label,
  tasks,
  selected,
  onToggle,
  full,
}: {
  label: string
  tasks: PlanTask[]
  selected: Set<string>
  onToggle: (id: string) => void
  full: boolean
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </h2>
      <div className="space-y-1">
        {tasks.map(task => {
          const isSelected = selected.has(task.id)
          const isDisabled = full && !isSelected
          return (
            <button
              key={task.id}
              onClick={() => onToggle(task.id)}
              disabled={isDisabled}
              className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                isSelected
                  ? 'bg-blue-600/20 border border-blue-600/50'
                  : isDisabled
                  ? 'bg-gray-900/50 opacity-40'
                  : 'bg-gray-900 active:bg-gray-800'
              }`}
            >
              <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-xs ${
                isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-600'
              }`}>
                {isSelected ? '✓' : ''}
              </span>
              <p className="flex-1 text-white text-sm leading-snug">{task.title}</p>
              {task.energy && (
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                  task.energy === 'deep'
                    ? 'bg-purple-900/60 text-purple-300'
                    : 'bg-gray-800 text-gray-400'
                }`}>
                  {task.energy}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
