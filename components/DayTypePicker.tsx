'use client'

import { useState, useTransition } from 'react'
import { setDayType } from '@/app/fuel/actions'
import type { Band } from '@/lib/fuel'

/** One tap sets what kind of day it is; the calorie target follows. */
export default function DayTypePicker({ bands, current }: { bands: Band[]; current: string | null }) {
  const [failed, setFailed] = useState(false)
  const [isPending, startTransition] = useTransition()
  return (
    <section>
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">Today is a</h2>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Day type">
        {bands.map(b => {
          const active = current === b.key
          return (
            <button
              key={b.key}
              onClick={() =>
                startTransition(async () => {
                  setFailed(false)
                  try {
                    await setDayType(b.key)
                  } catch {
                    setFailed(true)
                  }
                })
              }
              disabled={isPending}
              aria-pressed={active}
              className={`text-left px-3 py-2.5 rounded-xl disabled:opacity-60 ${
                active
                  ? 'bg-accent-soft ring-1 ring-accent/40 text-accent-ink'
                  : 'bg-card ring-1 ring-line text-ink-soft active:bg-sunk'
              }`}
            >
              <span className="block text-sm font-medium">{b.label}</span>
              <span className="block text-xs text-muted tabular-nums">
                {b.kcal.toLocaleString('en-GB')} kcal
              </span>
            </button>
          )
        })}
      </div>
      {failed && (
        <p role="alert" className="text-red-700 text-xs mt-2">
          Could not save — try again
        </p>
      )}
    </section>
  )
}
