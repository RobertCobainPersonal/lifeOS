'use client'

import { useState, useTransition } from 'react'
import { startFocus } from '@/app/time/actions'
import EnergyPicker from '@/components/EnergyPicker'

interface FocusStartFormProps {
  label: string
  taskId?: string
  clickupId?: string
}

const LENGTHS = [25, 50, 90]

export default function FocusStartForm({ label, taskId, clickupId }: FocusStartFormProps) {
  const [custom, setCustom] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function start(minutes: number) {
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      setError('Choose a length between 1 and 240 minutes')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const result = await startFocus({ taskId, clickupId, label, plannedMinutes: minutes, energy })
        if ('error' in result) {
          setError(
            result.error === 'focus_running'
              ? 'A focus session is already running.'
              : 'Something else just started. Try again.'
          )
        }
      } catch {
        setError('Could not start — try again')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Focus on</p>
        <p className="text-ink text-lg font-semibold leading-snug">{label}</p>
      </div>

      <EnergyPicker value={energy} onChange={setEnergy} />

      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Length</p>
        <div className="grid grid-cols-3 gap-2">
          {LENGTHS.map(minutes => (
            <button
              key={minutes}
              onClick={() => start(minutes)}
              disabled={isPending}
              className="py-4 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40"
            >
              {minutes} min
            </button>
          ))}
        </div>
        <form
          className="flex gap-2 mt-2"
          onSubmit={e => {
            e.preventDefault()
            start(Number(custom))
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Custom minutes"
            aria-label="Custom length in minutes"
            className="flex-1 bg-card ring-1 ring-line rounded-xl px-4 py-3 text-ink placeholder-faint text-base focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={isPending || custom.trim() === ''}
            className="px-4 bg-sunk active:bg-line-strong text-ink text-sm font-medium rounded-xl disabled:opacity-40"
          >
            Start
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
