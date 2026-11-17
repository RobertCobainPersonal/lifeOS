'use client'

import { useState, useTransition } from 'react'
import { setFocusProject } from '@/app/projects/actions'

export default function FocusProjectButton({ projectId, isFocus }: { projectId: string; isFocus: boolean }) {
  const [failed, setFailed] = useState(false)
  const [isPending, startTransition] = useTransition()
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        onClick={() =>
          startTransition(async () => {
            setFailed(false)
            try {
              await setFocusProject(isFocus ? null : projectId)
            } catch {
              setFailed(true)
            }
          })
        }
        disabled={isPending}
        aria-pressed={isFocus}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${
          isFocus ? 'bg-accent text-white' : 'bg-card ring-1 ring-line text-muted active:bg-sunk'
        }`}
      >
        {isFocus ? 'This week’s focus ✓' : 'Make this week’s focus'}
      </button>
      {failed && (
        <span role="alert" className="text-red-700 text-xs">
          Could not save — try again
        </span>
      )}
    </span>
  )
}
