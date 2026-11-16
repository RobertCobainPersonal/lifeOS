'use client'

import { useTransition } from 'react'
import { setFocusProject } from '@/app/projects/actions'

export default function FocusProjectButton({ projectId, isFocus }: { projectId: string; isFocus: boolean }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(() => setFocusProject(isFocus ? null : projectId))}
      disabled={isPending}
      aria-pressed={isFocus}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${
        isFocus ? 'bg-accent text-white' : 'bg-card ring-1 ring-line text-muted active:bg-sunk'
      }`}
    >
      {isFocus ? 'This week’s focus ✓' : 'Make this week’s focus'}
    </button>
  )
}
