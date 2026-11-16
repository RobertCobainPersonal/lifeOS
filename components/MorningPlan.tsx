'use client'

import { useState, useTransition } from 'react'
import { confirmMorningPlan, dismissMorningPlan } from '@/app/today/actions'

interface PlanTask {
  id: string
  title: string
  energy: string | null
  domain: string | null
  category: 'yesterday' | 'deferred' | 'due_today' | 'slipping' | 'tomorrow_pick' | 'project'
  projectName?: string | null
}

interface WorkTask {
  clickup_id: string
  title: string | null
  list_name: string | null
}

interface MorningPlanProps {
  tasks: PlanTask[]
  workTasks?: WorkTask[]
  /** Task chosen at last night's close-out; starts selected as the one thing. */
  preselectedTaskId?: string | null
}

const GROUPS: { key: PlanTask['category']; label: string }[] = [
  { key: 'tomorrow_pick', label: 'Chosen last night' },
  { key: 'yesterday', label: 'From yesterday' },
  { key: 'project', label: 'Projects · next action' },
  { key: 'deferred', label: 'Deferred' },
  { key: 'due_today', label: 'Due today' },
  { key: 'slipping', label: 'Slipping' },
]

export default function MorningPlan({ tasks, workTasks = [], preselectedTaskId = null }: MorningPlanProps) {
  // Ordered: the first selected item is the one thing.
  const [selected, setSelected] = useState<string[]>(
    preselectedTaskId && tasks.some(t => t.id === preselectedTaskId) ? [`t:${preselectedTaskId}`] : []
  )
  const [showWork, setShowWork] = useState(false)
  const [closed, setClosed] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (closed) return null

  function toggle(key: string) {
    setSelected(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key)
      if (prev.length >= 3) return prev
      return [...prev, key]
    })
  }

  function handleConfirm() {
    setClosed(true)
    const taskIds = selected.filter(k => k.startsWith('t:')).map(k => k.slice(2))
    const clickupIds = selected.filter(k => k.startsWith('c:')).map(k => k.slice(2))
    const oneThingId = selected.length > 0 ? selected[0].slice(2) : null
    startTransition(async () => {
      await confirmMorningPlan(taskIds, oneThingId, clickupIds)
    })
  }

  function handleSkip() {
    setClosed(true)
    startTransition(async () => {
      await dismissMorningPlan()
    })
  }

  const full = selected.length >= 3

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
          Tap your one thing first, then up to two more.
          {full && <span className="text-blue-400"> Top 3 full.</span>}
        </p>

        {tasks.length === 0 && workTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Nothing from yesterday or due today.</p>
            <p className="text-gray-700 text-sm mt-1">You&rsquo;re starting fresh.</p>
          </div>
        )}

        {GROUPS.map(group => {
          const groupTasks = tasks.filter(t => t.category === group.key)
          if (groupTasks.length === 0) return null
          return (
            <PlanGroup key={group.key} label={group.label}>
              {groupTasks.map(task => (
                <PlanRow
                  key={task.id}
                  title={task.title}
                  badge={task.projectName ?? task.energy}
                  order={selected.indexOf(`t:${task.id}`)}
                  disabled={full && !selected.includes(`t:${task.id}`)}
                  onToggle={() => toggle(`t:${task.id}`)}
                />
              ))}
            </PlanGroup>
          )
        })}

        {workTasks.length > 0 && (
          <div>
            <button
              onClick={() => setShowWork(s => !s)}
              className="w-full flex items-center justify-between px-3 py-3 bg-gray-900 rounded-xl active:bg-gray-800"
            >
              <span className="text-gray-400 text-sm font-medium">
                Pull from work · {workTasks.length} due today
              </span>
              <span className="text-gray-600 text-xs">{showWork ? 'Hide ↑' : 'Show ↓'}</span>
            </button>
            {showWork && (
              <div className="space-y-1 mt-2">
                {workTasks.map(task => (
                  <PlanRow
                    key={task.clickup_id}
                    title={task.title ?? 'Work item'}
                    badge={task.list_name}
                    order={selected.indexOf(`c:${task.clickup_id}`)}
                    disabled={full && !selected.includes(`c:${task.clickup_id}`)}
                    onToggle={() => toggle(`c:${task.clickup_id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 border-t border-gray-800 space-y-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full py-3.5 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-40 transition-colors"
        >
          {selected.length === 0 ? 'Start with empty Top 3' : `Set today (${selected.length})`}
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

function PlanGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function PlanRow({
  title,
  badge,
  order,
  disabled,
  onToggle,
}: {
  title: string
  badge: string | null
  /** Position in the selection, -1 when not selected. 0 is the one thing. */
  order: number
  disabled: boolean
  onToggle: () => void
}) {
  const isSelected = order >= 0
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isSelected}
      className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center gap-3 ${
        isSelected
          ? 'bg-blue-600/20 border border-blue-600/50'
          : disabled
          ? 'bg-gray-900/50 opacity-40'
          : 'bg-gray-900 active:bg-gray-800'
      }`}
    >
      <span
        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-xs ${
          isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-600'
        }`}
      >
        {isSelected ? order + 1 : ''}
      </span>
      <p className="flex-1 text-white text-sm leading-snug">{title}</p>
      {order === 0 && <span className="text-xs text-blue-300 shrink-0">one thing</span>}
      {badge && order !== 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded shrink-0 bg-gray-800 text-gray-400 max-w-[40%] truncate">
          {badge}
        </span>
      )}
    </button>
  )
}
