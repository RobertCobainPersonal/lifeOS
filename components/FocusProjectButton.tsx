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
        isFocus ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 active:bg-gray-800'
      }`}
    >
      {isFocus ? 'This week’s focus ✓' : 'Make this week’s focus'}
    </button>
  )
}
