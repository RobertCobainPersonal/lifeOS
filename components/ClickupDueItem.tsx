'use client'

import { useState, useTransition } from 'react'
import { pinClickUpToTop3 } from '@/app/clickup/actions'

interface ClickupDueItemProps {
  clickupId: string
  title: string
  status: string | null
  url: string
  listName: string | null
  top3Count: number
}

export default function ClickupDueItem({
  clickupId,
  title,
  status,
  url,
  listName,
  top3Count,
}: ClickupDueItemProps) {
  const [pinned, setPinned] = useState(false)
  const [pinError, setPinError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handlePin() {
    if (top3Count >= 3) {
      setPinError('Top 3 is full')
      setTimeout(() => setPinError(''), 2000)
      return
    }
    setPinned(true)
    setPinError('')
    startTransition(async () => {
      try {
        await pinClickUpToTop3(clickupId)
      } catch (e) {
        setPinned(false)
        setPinError(e instanceof Error ? e.message : 'Failed')
      }
    })
  }

  if (pinned) return null

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0">
      <div className="w-6 h-6 shrink-0 rounded-full border-2 border-gray-700 flex items-center justify-center">
        <span className="text-gray-600 text-[9px]">CU</span>
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-sm leading-snug hover:underline"
        >
          {title}
        </a>
        {listName && <p className="text-gray-600 text-xs mt-0.5">{listName}</p>}
        {pinError && <p className="text-red-400 text-xs mt-0.5">{pinError}</p>}
      </div>
      {status && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 shrink-0">
          {status}
        </span>
      )}
      <button
        onClick={handlePin}
        disabled={isPending}
        className="text-gray-600 active:text-yellow-400 text-lg shrink-0 disabled:opacity-40 transition-colors"
        aria-label={`Add "${title}" to Top 3`}
      >
        ☆
      </button>
    </div>
  )
}
