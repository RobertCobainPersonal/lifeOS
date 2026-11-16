'use client'

import { useState, useTransition } from 'react'
import { confirmMorningPlan, dismissMorningPlan } from '@/app/today/actions'
import { formatGap, londonClock, type CalendarEvent, type Gap } from '@/lib/calendar'

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
  /** Today's calendar, shown for context above the choices. */
  meetings?: CalendarEvent[]
  gaps?: Gap[]
}

const GROUPS: { key: PlanTask['category']; label: string }[] = [
  { key: 'tomorrow_pick', label: 'Chosen last night' },
  { key: 'yesterday', label: 'From yesterday' },
  { key: 'project', label: 'Projects · next action' },
  { key: 'deferred', label: 'Deferred' },
  { key: 'due_today', label: 'Due today' },
  { key: 'slipping', label: 'Slipping' },
]

export default function MorningPlan({
  tasks,
  workTasks = [],
  preselectedTaskId = null,
  meetings = [],
  gaps = [],
}: MorningPlanProps) {
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
    <div className="fixed inset-0 z-[60] bg-paper flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-4 border-b border-line">
        <h1 className="text-xl font-bold text-ink">Morning Plan</h1>
        <button
          onClick={handleSkip}
          disabled={isPending}
          className="text-muted text-sm active:text-ink-soft disabled:opacity-40 px-2 py-1"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {meetings.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Today&rsquo;s meetings
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4 py-1">
              {meetings.map(m => (
                <div
                  key={m.source_id}
                  className="flex gap-3 py-2.5 border-b border-line last:border-0 text-sm"
                >
                  <span className="shrink-0 w-24 text-muted tabular-nums">
                    {m.all_day ? 'All day' : `${londonClock(m.starts_at)}–${londonClock(m.ends_at)}`}
                  </span>
                  <span className="flex-1 text-ink leading-snug">
                    {m.title}
                    {m.location ? <span className="text-muted"> · {m.location}</span> : null}
                  </span>
                </div>
              ))}
            </div>
            {gaps.length > 0 && (
              <p className="text-muted text-sm mt-2">
                Free {gaps.slice(0, 3).map(formatGap).join(' · ')}
              </p>
            )}
          </div>
        )}

        <p className="text-muted text-sm">
          Tap your one thing first, then up to two more.
          {full && <span className="text-accent-ink"> Top 3 full.</span>}
        </p>

        {tasks.length === 0 && workTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-faint">Nothing from yesterday or due today.</p>
            <p className="text-faint text-sm mt-1">You&rsquo;re starting fresh.</p>
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
              className="w-full flex items-center justify-between px-3 py-3 bg-card ring-1 ring-line rounded-xl active:bg-sunk"
            >
              <span className="text-muted text-sm font-medium">
                Pull from work · {workTasks.length} due today
              </span>
              <span className="text-faint text-xs">{showWork ? 'Hide ↑' : 'Show ↓'}</span>
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

      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 border-t border-line space-y-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full py-3.5 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40 transition-colors"
        >
          {selected.length === 0 ? 'Start with empty Top 3' : `Set today (${selected.length})`}
        </button>
        <button
          onClick={handleSkip}
          disabled={isPending}
          className="w-full py-2 text-faint text-sm active:text-muted disabled:opacity-40"
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
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{label}</h2>
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
          ? 'bg-accent-soft border border-accent/40'
          : disabled
          ? 'bg-card/60 opacity-40'
          : 'bg-card ring-1 ring-line active:bg-sunk'
      }`}
    >
      <span
        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-xs ${
          isSelected ? 'border-accent bg-accent text-white' : 'border-faint'
        }`}
      >
        {isSelected ? order + 1 : ''}
      </span>
      <p className="flex-1 text-ink text-sm leading-snug">{title}</p>
      {order === 0 && <span className="text-xs text-accent-ink shrink-0">one thing</span>}
      {badge && order !== 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded shrink-0 bg-sunk text-muted max-w-[40%] truncate">
          {badge}
        </span>
      )}
    </button>
  )
}
