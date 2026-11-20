'use client'

import { useState, useTransition } from 'react'
import { browseClickUp, followList, followTask } from '@/app/clickup/actions'
import type { BrowseSpace } from '@/lib/clickup'

/** Paste a list or task link, or browse Spaces → Folders → Lists and follow. */
export default function ClickupFollowPicker({ followedListIds }: { followedListIds: string[] }) {
  const [link, setLink] = useState('')
  const [spaces, setSpaces] = useState<BrowseSpace[] | null>(null)
  const [openSpace, setOpenSpace] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const followed = new Set(followedListIds)

  function addLink(e: { preventDefault(): void }) {
    e.preventDefault()
    const ref = link.trim()
    if (!ref) return
    setMessage('')
    startTransition(async () => {
      try {
        const isList = /\/li\/\d+/.test(ref) || /^\d{6,}$/.test(ref)
        const result = isList ? await followList(ref) : await followTask(ref)
        if (result.error) {
          setMessage(result.error)
          return
        }
        setLink('')
        setMessage(isList ? 'List followed' : 'Task added')
      } catch {
        setMessage('Could not save — try again')
      }
    })
  }

  function loadSpaces() {
    setMessage('')
    startTransition(async () => {
      const result = await browseClickUp()
      if (result.error) setMessage(result.error)
      else setSpaces(result.spaces ?? [])
    })
  }

  function follow(id: string) {
    setMessage('')
    startTransition(async () => {
      try {
        const result = await followList(id)
        if (result.error) setMessage(result.error)
      } catch {
        setMessage('Could not save — try again')
      }
    })
  }

  const listButton = (l: { id: string; name: string }) => (
    <li key={l.id} className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm text-ink-soft min-w-0 truncate">{l.name}</span>
      {followed.has(l.id) ? (
        <span className="text-xs text-accent-ink px-2 py-1">Following</span>
      ) : (
        <button
          onClick={() => follow(l.id)}
          disabled={isPending}
          className="text-xs text-accent-ink ring-1 ring-line rounded-lg px-2 py-1 active:bg-sunk disabled:opacity-40"
        >
          Follow
        </button>
      )}
    </li>
  )

  return (
    <div className="space-y-4">
      <form onSubmit={addLink} className="flex gap-2" aria-label="Add from a ClickUp link">
        <input
          type="text"
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder="Paste a ClickUp list or task link"
          aria-label="ClickUp list or task link"
          autoComplete="off"
          className="flex-1 min-w-0 bg-sunk rounded-lg px-3 py-2 text-ink text-sm placeholder-faint focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isPending || link.trim() === ''}
          className="px-3 py-2 bg-accent text-white text-sm rounded-lg disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {spaces === null ? (
        <button onClick={loadSpaces} disabled={isPending} className="text-sm text-accent-ink disabled:opacity-40">
          {isPending ? 'Loading your ClickUp…' : 'Browse lists to follow'}
        </button>
      ) : (
        <div className="divide-y divide-line">
          {spaces.map(s => {
            const open = openSpace === s.id
            const count = s.lists.length + s.folders.reduce((n, f) => n + f.lists.length, 0)
            return (
              <div key={s.id} className="py-1">
                <button
                  onClick={() => setOpenSpace(open ? null : s.id)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between py-2 text-left"
                >
                  <span className="text-sm font-medium text-ink">{s.name}</span>
                  <span className="text-xs text-faint">
                    {count} list{count === 1 ? '' : 's'} {open ? '↑' : '↓'}
                  </span>
                </button>
                {open && (
                  <div className="pb-2 pl-2">
                    {s.folders.map(f => (
                      <div key={f.id} className="mb-2">
                        <p className="text-xs text-muted pt-1">{f.name}</p>
                        <ul className="pl-2">{f.lists.map(listButton)}</ul>
                      </div>
                    ))}
                    {s.lists.length > 0 && <ul>{s.lists.map(listButton)}</ul>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {message && (
        <p role="status" className="text-muted text-sm">
          {message}
        </p>
      )}
    </div>
  )
}
