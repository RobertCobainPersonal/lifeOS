'use client'

import { useState, useTransition } from 'react'
import { removeEvent } from '@/app/calendar/actions'

export default function RemoveEventButton({ sourceId, title }: { sourceId: string; title: string }) {
  const [failed, setFailed] = useState(false)
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          setFailed(false)
          try {
            await removeEvent(sourceId)
          } catch {
            setFailed(true)
          }
        })
      }
      disabled={isPending}
      aria-label={`Remove ${title}`}
      title={failed ? 'Could not remove — try again' : 'Remove'}
      className={`shrink-0 w-7 h-7 -my-1 disabled:opacity-40 ${failed ? 'text-red-700' : 'text-faint active:text-ink-soft'}`}
    >
      ×
    </button>
  )
}
