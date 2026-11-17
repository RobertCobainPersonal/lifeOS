'use client'

import { useState, useTransition } from 'react'
import { resetMyDay } from '@/app/today/actions'

interface ResetTask {
  id: string
  title: string
  energy: string | null
  category: 'top3' | 'due_today'
}

interface ResetMyDayProps {
  top3Tasks: ResetTask[]
  dueTodayTasks: ResetTask[]
}

export default function ResetMyDay({ top3Tasks, dueTodayTasks }: ResetMyDayProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const allTasks = [
    ...top3Tasks.map(t => ({ ...t, category: 'top3' as const })),
    ...dueTodayTasks.map(t => ({ ...t, category: 'due_today' as const })),
  ]
  // Deduplicate (a task could appear in both if top3 + due today)
  const seen = new Set<string>()
  const uniqueTasks = allTasks.filter(t => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
  const allIds = uniqueTasks.map(t => t.id)

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
    setOpen(false)
    startTransition(async () => {
      await resetMyDay(Array.from(selected), allIds)
    })
  }

  function handleOpen() {
    // Pre-select current top3 items
    setSelected(new Set(top3Tasks.map(t => t.id).slice(0, 3)))
    setOpen(true)
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        disabled={isPending}
        className="w-full text-left px-4 py-3 bg-card ring-1 ring-line rounded-xl text-muted text-sm active:bg-sunk disabled:opacity-40 transition-colors"
      >
        ↺ Reset my day
      </button>
    )
  }

  return (
    <>
      <div className="hidden lg:block fixed inset-0 z-[59] bg-ink/30" aria-hidden="true" />
      <div className="fixed inset-0 z-[60] bg-paper flex flex-col lg:inset-y-10 lg:mx-auto lg:max-w-xl lg:rounded-2xl lg:shadow-xl lg:ring-1 lg:ring-line lg:overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-12 lg:pt-5 pb-4 border-b border-line">
        <h1 className="text-xl font-bold text-ink">Reset My Day</h1>
        <button
          onClick={() => setOpen(false)}
          className="text-muted text-sm active:text-ink-soft px-2 py-1"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <p className="text-muted text-sm">
          Pick up to 3 things that still matter today. Everything else is deferred to tomorrow.
          {selected.size === 3 && <span className="text-accent-ink"> Top 3 full.</span>}
        </p>

        {uniqueTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-faint">Nothing to reset — your day is already clear.</p>
          </div>
        ) : (
          <>
            {top3Tasks.length > 0 && (
              <TaskGroup
                label="Current Top 3"
                tasks={top3Tasks}
                selected={selected}
                onToggle={toggle}
                full={selected.size >= 3}
              />
            )}
            {dueTodayTasks.filter(t => !top3Tasks.find(tt => tt.id === t.id)).length > 0 && (
              <TaskGroup
                label="Due today"
                tasks={dueTodayTasks.filter(t => !top3Tasks.find(tt => tt.id === t.id))}
                selected={selected}
                onToggle={toggle}
                full={selected.size >= 3}
              />
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 border-t border-line space-y-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full py-3.5 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40 transition-colors"
        >
          {selected.size === 0 ? 'Clear the rest, start fresh' : `Keep these ${selected.size}, defer the rest`}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="w-full py-2 text-faint text-sm active:text-muted disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
      </div>
    </>
  )
}

function TaskGroup({
  label,
  tasks,
  selected,
  onToggle,
  full,
}: {
  label: string
  tasks: ResetTask[]
  selected: Set<string>
  onToggle: (id: string) => void
  full: boolean
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{label}</h2>
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
                  ? 'bg-accent-soft border border-accent/40'
                  : isDisabled
                  ? 'bg-card/60 opacity-40'
                  : 'bg-card ring-1 ring-line active:bg-sunk'
              }`}
            >
              <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-xs ${
                isSelected ? 'border-accent bg-accent text-white' : 'border-faint'
              }`}>
                {isSelected ? '✓' : ''}
              </span>
              <p className="flex-1 text-ink text-sm leading-snug">{task.title}</p>
              {task.energy && (
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                  task.energy === 'deep'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-sunk text-muted'
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
