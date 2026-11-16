'use client'

import { useState, useTransition } from 'react'
import { setBand } from '@/app/projects/actions'
import { addToTop3, completeTask, removeFromTop3 } from '@/app/tasks/actions'
import { BANDS, BAND_LABEL, type Band } from '@/lib/projects'

interface ProjectTaskRowProps {
  id: string
  title: string
  band: Band
  isTop3Today: boolean
  top3Full: boolean
}

export default function ProjectTaskRow({ id, title, band, isTop3Today, top3Full }: ProjectTaskRowProps) {
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<void>) {
    setError('')
    startTransition(async () => {
      try {
        await action()
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <div className="py-3 border-b border-line last:border-0">
      <div className="flex items-start gap-3">
        <button
          onClick={() => run(() => completeTask(id))}
          disabled={isPending}
          aria-label={`Complete "${title}"`}
          className="mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 border-faint active:border-green-500 active:bg-green-500/10 disabled:opacity-40"
        />
        <p className="flex-1 text-ink text-sm leading-snug">{title}</p>
        {band === 'now' && (
          <button
            onClick={() => run(() => (isTop3Today ? removeFromTop3(id) : addToTop3(id)))}
            disabled={isPending || (!isTop3Today && top3Full)}
            aria-pressed={isTop3Today}
            aria-label={isTop3Today ? 'Remove from Top 3' : 'Add to Top 3'}
            className={`shrink-0 text-lg leading-none px-1 disabled:opacity-30 ${
              isTop3Today ? 'text-amber-600' : 'text-faint active:text-ink-soft'
            }`}
          >
            {isTop3Today ? '★' : '☆'}
          </button>
        )}
        <button
          onClick={() => setMoving(m => !m)}
          aria-expanded={moving}
          className="shrink-0 text-xs text-muted active:text-ink-soft px-1 py-1"
        >
          Move
        </button>
      </div>

      {moving && (
        <div className="flex gap-2 mt-2 pl-9">
          {BANDS.filter(b => b !== band).map(b => (
            <button
              key={b}
              onClick={() => {
                setMoving(false)
                run(() => setBand(id, b))
              }}
              disabled={isPending}
              className="px-3 py-1.5 bg-sunk active:bg-line-strong text-ink-soft text-xs font-medium rounded-lg disabled:opacity-40"
            >
              To {BAND_LABEL[b]}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-700 text-xs mt-1 pl-9">
          {error}
        </p>
      )}
    </div>
  )
}
