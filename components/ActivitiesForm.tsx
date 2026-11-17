'use client'

import { useState, useTransition } from 'react'
import {
  addActivity,
  moveActivity,
  renameActivity,
  setActivityArchived,
} from '@/app/settings/activity-actions'

export interface EditorItem {
  id: string
  name: string
  parts: { id: string; name: string }[]
}

interface ActivitiesFormProps {
  groups: EditorItem[]
  archived: { id: string; name: string }[]
}

const input =
  'flex-1 min-w-0 bg-sunk text-ink px-3 py-2 rounded-lg text-sm placeholder-faint focus:outline-none focus:ring-1 focus:ring-line-strong'
const small = 'text-muted text-xs active:text-ink-soft disabled:opacity-40 px-1.5 py-1'

/** Add, rename, reorder and archive the activities time is tracked against. */
export default function ActivitiesForm({ groups, archived }: ActivitiesFormProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function run(work: () => Promise<{ error?: string }>, after?: () => void) {
    setError('')
    startTransition(async () => {
      try {
        const result = await work()
        if (result.error) {
          setError(result.error)
          return
        }
        after?.()
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  function row(item: { id: string; name: string }, index: number, count: number, isPart: boolean) {
    if (editing === item.id) {
      return (
        <form
          className="flex gap-2 py-1.5"
          onSubmit={e => {
            e.preventDefault()
            run(() => renameActivity(item.id, draft), () => setEditing(null))
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            aria-label={`New name for ${item.name}`}
            maxLength={40}
            className={input}
          />
          <button type="submit" disabled={isPending} className="px-3 py-2 bg-accent text-white text-sm rounded-lg disabled:opacity-40">
            Save
          </button>
          <button type="button" onClick={() => setEditing(null)} className={small}>
            Cancel
          </button>
        </form>
      )
    }
    return (
      <div className={`flex items-center gap-1 py-1.5 ${isPart ? 'pl-4' : ''}`}>
        <span className={`flex-1 min-w-0 truncate text-sm ${isPart ? 'text-ink-soft' : 'text-ink font-medium'}`}>
          {item.name}
        </span>
        <button
          onClick={() => run(() => moveActivity(item.id, -1))}
          disabled={isPending || index === 0}
          aria-label={`Move ${item.name} up`}
          className={small}
        >
          ↑
        </button>
        <button
          onClick={() => run(() => moveActivity(item.id, 1))}
          disabled={isPending || index === count - 1}
          aria-label={`Move ${item.name} down`}
          className={small}
        >
          ↓
        </button>
        <button
          onClick={() => {
            setEditing(item.id)
            setDraft(item.name)
          }}
          className={small}
        >
          Rename
        </button>
        <button onClick={() => run(() => setActivityArchived(item.id, true))} disabled={isPending} className={small}>
          Archive
        </button>
      </div>
    )
  }

  function addForm(parentId: string | null, placeholder: string) {
    const key = parentId ?? 'top'
    if (adding !== key) {
      return (
        <button
          onClick={() => {
            setAdding(key)
            setNewName('')
          }}
          className={`text-accent-ink text-sm py-1.5 ${parentId ? 'pl-4' : ''}`}
        >
          + {parentId ? 'Add a part' : 'Add a group'}
        </button>
      )
    }
    return (
      <form
        className={`flex gap-2 py-1.5 ${parentId ? 'pl-4' : ''}`}
        onSubmit={e => {
          e.preventDefault()
          run(() => addActivity(newName, parentId), () => setAdding(null))
        }}
      >
        <input
          autoFocus
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={40}
          className={input}
        />
        <button type="submit" disabled={isPending} className="px-3 py-2 bg-accent text-white text-sm rounded-lg disabled:opacity-40">
          Add
        </button>
        <button type="button" onClick={() => setAdding(null)} className={small}>
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div>
      {groups.map((g, i) => (
        <div key={g.id} className="border-b border-line py-1.5">
          {row(g, i, groups.length, false)}
          {g.parts.map((p, j) => (
            <div key={p.id}>{row(p, j, g.parts.length, true)}</div>
          ))}
          {addForm(g.id, `New part of ${g.name}`)}
        </div>
      ))}
      <div className="pt-2">{addForm(null, 'New group, e.g. Family')}</div>

      {error && (
        <p role="alert" className="text-red-700 text-xs mt-2">
          {error}
        </p>
      )}

      {archived.length > 0 && (
        <details className="mt-3">
          <summary className="text-muted text-xs cursor-pointer">Archived ({archived.length})</summary>
          {archived.map(a => (
            <div key={a.id} className="flex items-center justify-between py-1.5">
              <span className="text-muted text-sm">{a.name}</span>
              <button onClick={() => run(() => setActivityArchived(a.id, false))} disabled={isPending} className={small}>
                Restore
              </button>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
