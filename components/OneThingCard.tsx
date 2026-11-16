'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { setOneThing } from '@/app/today/actions'
import { completeTask } from '@/app/tasks/actions'
import type { OneThing } from '@/lib/onething'

export interface OneThingOption {
  kind: 'task' | 'clickup'
  id: string
  title: string
}

interface OneThingCardProps {
  oneThing: OneThing
  options: OneThingOption[]
  /** Where "Start focus" goes; omitted while a timer is already running. */
  focusHref?: string | null
}

export default function OneThingCard({ oneThing, options, focusHref }: OneThingCardProps) {
  const [choosing, setChoosing] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function choose(option: OneThingOption) {
    setError('')
    setChoosing(false)
    startTransition(async () => {
      try {
        await setOneThing(
          option.kind === 'task' ? { taskId: option.id } : { clickupId: option.id }
        )
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  function complete(id: string) {
    setError('')
    startTransition(async () => {
      try {
        await completeTask(id)
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  const others = options.filter(
    o => oneThing.state === 'none' || !(o.kind === oneThing.kind && o.id === oneThing.id)
  )

  return (
    <section className="mb-6" aria-label="One thing">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
        One thing
      </h2>
      <div className="bg-card rounded-xl p-4 border border-line">
        {oneThing.state === 'none' && (
          <button
            onClick={() => setChoosing(c => !c)}
            disabled={isPending}
            className="w-full text-left text-ink-soft text-base active:text-ink disabled:opacity-40"
          >
            Pick your one thing
          </button>
        )}

        {oneThing.state === 'open' && (
          <div>
            <div className="flex items-start gap-3">
              {oneThing.kind === 'task' && (
                <button
                  onClick={() => complete(oneThing.id)}
                  disabled={isPending}
                  className="mt-0.5 w-7 h-7 shrink-0 rounded-full border-2 border-faint active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
                  aria-label={`Complete "${oneThing.title}"`}
                />
              )}
              <p className="flex-1 text-ink text-lg font-semibold leading-snug">
                {oneThing.title}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-3">
              {focusHref && (
                <Link
                  href={focusHref}
                  className="px-4 py-2 bg-accent active:bg-accent-strong text-white text-sm font-semibold rounded-lg"
                >
                  Start focus
                </Link>
              )}
              {others.length > 0 && (
                <button
                  onClick={() => setChoosing(c => !c)}
                  disabled={isPending}
                  className="text-muted text-sm active:text-ink-soft disabled:opacity-40"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        )}

        {oneThing.state === 'done' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted text-base line-through leading-snug">{oneThing.title}</p>
            <button
              onClick={() => setChoosing(c => !c)}
              disabled={isPending}
              className="shrink-0 text-accent-ink text-sm active:text-accent-ink disabled:opacity-40"
            >
              Pick another
            </button>
          </div>
        )}

        {choosing && (
          <div className="mt-3 border-t border-line pt-2">
            {others.length === 0 ? (
              <p className="text-muted text-sm py-2">
                Nothing in your Top 3 yet.{' '}
                <Link href="/tasks" className="text-accent-ink">
                  Star a task
                </Link>{' '}
                first.
              </p>
            ) : (
              others.map(o => (
                <button
                  key={`${o.kind}:${o.id}`}
                  onClick={() => choose(o)}
                  className="w-full text-left py-2.5 text-ink-soft text-sm active:text-ink border-b border-line last:border-0"
                >
                  {o.title}
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-red-700 text-xs mt-2">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
