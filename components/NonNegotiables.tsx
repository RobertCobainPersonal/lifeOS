'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { setTick } from '@/app/habits/actions'

interface Item {
  id: string
  name: string
  done: boolean
}

/** Daily ticks. Tapping again unticks; an unticked day carries no penalty. */
export default function NonNegotiables({ items }: { items: Item[] }) {
  const [optimistic, applyOptimistic] = useOptimistic(items, (state, change: { id: string; done: boolean }) =>
    state.map(i => (i.id === change.id ? { ...i, done: change.done } : i))
  )
  const [error, setError] = useState(false)
  const [, startTransition] = useTransition()

  if (items.length === 0) return null

  function toggle(item: Item) {
    setError(false)
    startTransition(async () => {
      applyOptimistic({ id: item.id, done: !item.done })
      try {
        await setTick(item.id, !item.done)
      } catch {
        setError(true)
      }
    })
  }

  return (
    <section className="mb-6" aria-label="Non-negotiables">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
        Non-negotiables
      </h2>
      <div className="flex flex-wrap gap-2">
        {optimistic.map(item => (
          <button
            key={item.id}
            onClick={() => toggle(item)}
            aria-pressed={item.done}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${
              item.done
                ? 'bg-accent-soft ring-1 ring-accent/40 text-accent-ink'
                : 'bg-card ring-1 ring-line text-ink-soft active:bg-sunk'
            }`}
          >
            {item.done ? '✓ ' : ''}
            {item.name}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-700 text-xs mt-2">
          Could not save — try again
        </p>
      )}
    </section>
  )
}
