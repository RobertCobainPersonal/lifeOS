'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { startTrack } from '@/app/time/actions'
import EnergyPicker from '@/components/EnergyPicker'

export interface PickerGroup {
  id: string
  name: string
  parts: { id: string; name: string }[]
}

interface ActivityPickerProps {
  groups: PickerGroup[]
  /** Activity running now, and its group, shown as selected. */
  currentId?: string | null
  currentGroup?: string | null
}

/**
 * Groups first. A group with parts opens to show them; anything else starts at
 * once, ending whatever was being tracked. The running group stays open so
 * switching between its parts is one tap.
 */
export default function ActivityPicker({ groups, currentId = null, currentGroup = null }: ActivityPickerProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(currentGroup)
  const [label, setLabel] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function start(activityId: string) {
    setError('')
    startTransition(async () => {
      try {
        const result = await startTrack({ activityId, label, energy })
        if ('error' in result) {
          setError(
            result.error === 'focus_running'
              ? 'A focus session is running. End it first.'
              : 'Something else just started. Try again.'
          )
          return
        }
        setLabel('')
        setEnergy(null)
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  const opened = groups.find(g => g.id === openGroup && g.parts.length > 0) ?? null
  const tile = (selected: boolean) =>
    `min-h-[56px] px-2 py-3 rounded-xl text-sm font-medium leading-tight transition-colors ${
      selected
        ? 'bg-accent-soft border border-accent/40 text-accent-ink'
        : 'bg-card ring-1 ring-line text-ink-soft active:bg-sunk disabled:opacity-60'
    }`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {groups.map(g => {
          const hasParts = g.parts.length > 0
          const selected = g.id === currentGroup || g.id === opened?.id
          return (
            <button
              key={g.id}
              onClick={() => (hasParts ? setOpenGroup(opened?.id === g.id ? null : g.id) : start(g.id))}
              disabled={isPending || (!hasParts && g.id === currentId)}
              aria-pressed={hasParts ? undefined : g.id === currentId}
              aria-expanded={hasParts ? opened?.id === g.id : undefined}
              className={tile(selected)}
            >
              {g.name}
              {hasParts && <span className="block text-[11px] font-normal text-muted mt-0.5">{g.parts.length} parts</span>}
            </button>
          )
        })}
      </div>

      {opened && (
        <div className="rounded-xl bg-sunk p-2">
          <p className="text-xs text-muted px-1 pb-2">{opened.name}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {opened.parts.map(p => (
              <button
                key={p.id}
                onClick={() => start(p.id)}
                disabled={isPending || p.id === currentId}
                aria-pressed={p.id === currentId}
                className={tile(p.id === currentId)}
              >
                {p.name}
              </button>
            ))}
            <button
              onClick={() => start(opened.id)}
              disabled={isPending || opened.id === currentId}
              aria-pressed={opened.id === currentId}
              className={tile(opened.id === currentId)}
            >
              {opened.name} <span className="font-normal text-muted">(general)</span>
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="What is it? (optional)"
        maxLength={120}
        autoComplete="off"
        className="w-full bg-card ring-1 ring-line rounded-xl px-4 py-3 text-ink placeholder-faint text-base focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <EnergyPicker value={energy} onChange={setEnergy} />

      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}

      <Link href="/settings#activities" className="inline-block text-sm text-muted underline underline-offset-2">
        Edit the list
      </Link>
    </div>
  )
}
