'use client'

import { useState } from 'react'
import ClickupListGroup, { type ClickupTask } from './ClickupListGroup'

interface ClickupTaskListProps {
  groups: { listName: string; items: ClickupTask[] }[]
  today: string
}

export default function ClickupTaskList({ groups, today }: ClickupTaskListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const allCollapsed = collapsed.size === groups.length

  function toggle(listName: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(listName)) next.delete(listName)
      else next.add(listName)
      return next
    })
  }

  function toggleAll() {
    if (allCollapsed) {
      setCollapsed(new Set())
    } else {
      setCollapsed(new Set(groups.map(g => g.listName)))
    }
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          onClick={toggleAll}
          className="text-xs text-gray-600 active:text-gray-400 transition-colors"
        >
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>

      {groups.map(({ listName, items }) => (
        <ClickupListGroup
          key={listName}
          listName={listName}
          tasks={items}
          today={today}
          expanded={!collapsed.has(listName)}
          onToggle={() => toggle(listName)}
        />
      ))}
    </>
  )
}
