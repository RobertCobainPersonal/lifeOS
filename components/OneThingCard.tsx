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
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
        One thing
      </h2>
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        {oneThing.state === 'none' && (
          <button
            onClick={() => setChoosing(c => !c)}
            disabled={isPending}
            className="w-full text-left text-gray-300 text-base active:text-white disabled:opacity-40"
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
                  className="mt-0.5 w-7 h-7 shrink-0 rounded-full border-2 border-gray-500 active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
                  aria-label={`Complete "${oneThing.title}"`}
                />
              )}
              <p className="flex-1 text-white text-lg font-semibold leading-snug">
                {oneThing.title}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-3">
              {focusHref && (
                <Link
                  href={focusHref}
                  className="px-4 py-2 bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                >
                  Start focus
                </Link>
              )}
              {others.length > 0 && (
                <button
                  onClick={() => setChoosing(c => !c)}
                  disabled={isPending}
                  className="text-gray-500 text-sm active:text-gray-300 disabled:opacity-40"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        )}

        {oneThing.state === 'done' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-gray-500 text-base line-through leading-snug">{oneThing.title}</p>
            <button
              onClick={() => setChoosing(c => !c)}
              disabled={isPending}
              className="shrink-0 text-blue-400 text-sm active:text-blue-300 disabled:opacity-40"
            >
              Pick another
            </button>
          </div>
        )}

        {choosing && (
          <div className="mt-3 border-t border-gray-800 pt-2">
            {others.length === 0 ? (
              <p className="text-gray-500 text-sm py-2">
                Nothing in your Top 3 yet.{' '}
                <Link href="/tasks" className="text-blue-400">
                  Star a task
                </Link>{' '}
                first.
              </p>
            ) : (
              others.map(o => (
                <button
                  key={`${o.kind}:${o.id}`}
                  onClick={() => choose(o)}
                  className="w-full text-left py-2.5 text-gray-200 text-sm active:text-white border-b border-gray-800 last:border-0"
                >
                  {o.title}
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-red-400 text-xs mt-2">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
