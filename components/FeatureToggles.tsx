'use client'

import { useState, useTransition } from 'react'
import { setFeature } from '@/app/settings/actions'
import { FEATURES, type FeatureKey } from '@/lib/features'

/** Switches for the optional parts of LifeOS. Everything starts off. */
export default function FeatureToggles({ enabled }: { enabled: FeatureKey[] }) {
  const [on, setOn] = useState<Set<FeatureKey>>(new Set(enabled))
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function toggle(key: FeatureKey) {
    const next = !on.has(key)
    setError('')
    setOn(prev => {
      const copy = new Set(prev)
      if (next) copy.add(key)
      else copy.delete(key)
      return copy
    })
    startTransition(async () => {
      try {
        await setFeature(key, next)
      } catch {
        // put the switch back where it was
        setOn(prev => {
          const copy = new Set(prev)
          if (next) copy.delete(key)
          else copy.add(key)
          return copy
        })
        setError('Could not save — try again')
      }
    })
  }

  return (
    <div>
      {FEATURES.map(f => {
        const active = on.has(f.key)
        return (
          <div key={f.key} className="flex items-start gap-3 py-3 border-b border-line last:border-0">
            <div className="flex-1">
              <p className="text-ink text-sm font-medium">{f.label}</p>
              <p className="text-muted text-xs mt-0.5 leading-snug">{f.note}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={f.label}
              onClick={() => toggle(f.key)}
              disabled={isPending}
              className={`shrink-0 mt-0.5 w-12 h-7 rounded-full p-0.5 transition-colors disabled:opacity-60 ${
                active ? 'bg-accent' : 'bg-line-strong'
              }`}
            >
              <span
                className={`block w-6 h-6 rounded-full bg-card transition-transform ${
                  active ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        )
      })}
      {error && (
        <p role="alert" className="text-red-700 text-xs mt-2">
          {error}
        </p>
      )}
    </div>
  )
}
