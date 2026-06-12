'use client'

import { useState, useTransition } from 'react'
import { triageCapture, createTaskFromCapture } from '@/app/inbox/actions'

interface CaptureCardProps {
  id: string
  rawText: string
  createdAt: string
  source: string | null
  url: string | null
}

export default function CaptureCard({ id, rawText, createdAt, source, url }: CaptureCardProps) {
  const [showForm, setShowForm] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const trimmed = rawText.trim()
  const isEmpty = !trimmed
  const displayText = trimmed || '(empty capture)'

  function handleTriage(result: 'someday' | 'done' | 'deleted') {
    setDismissed(true)
    setError('')
    startTransition(async () => {
      try {
        await triageCapture(id, result)
      } catch {
        setDismissed(false)
        setError('Failed — try again')
      }
    })
  }

  if (dismissed) return null

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-3">
      <p className={`text-base leading-snug mb-2 break-words ${isEmpty ? 'text-gray-500 italic' : 'text-white'}`}>
        {displayText}
      </p>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-600">
          {new Date(createdAt).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {source && source !== 'manual' && (
          <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
            {source}
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-400"
          >
            source link
          </a>
        )}
      </div>

      {showForm ? (
        <TaskForm
          captureId={id}
          defaultTitle={trimmed}
          onCancel={() => setShowForm(false)}
          onSuccess={() => setDismissed(true)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {!isEmpty && (
            <button
              onClick={() => setShowForm(true)}
              disabled={isPending}
              className="px-4 py-2.5 bg-blue-600 active:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
            >
              Task
            </button>
          )}
          <button
            onClick={() => handleTriage('someday')}
            disabled={isPending}
            className="px-4 py-2.5 bg-gray-800 active:bg-gray-700 text-gray-300 text-sm rounded-lg disabled:opacity-40 transition-colors"
          >
            Someday
          </button>
          <button
            onClick={() => handleTriage('done')}
            disabled={isPending}
            className="px-4 py-2.5 bg-gray-800 active:bg-gray-700 text-gray-300 text-sm rounded-lg disabled:opacity-40 transition-colors"
          >
            Done
          </button>
          <button
            onClick={() => handleTriage('deleted')}
            disabled={isPending}
            className="px-4 py-2.5 bg-gray-800 active:bg-gray-700 text-red-500 text-sm rounded-lg disabled:opacity-40 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-400 text-xs mt-2">{error}</p>
      )}
    </div>
  )
}

function TaskForm({
  captureId,
  defaultTitle,
  onCancel,
  onSuccess,
}: {
  captureId: string
  defaultTitle: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState(defaultTitle)
  const [domain, setDomain] = useState<'work' | 'personal' | ''>('')
  const [energy, setEnergy] = useState<'deep' | 'admin' | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const canSubmit = title.trim() && domain && energy && !isPending

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!canSubmit) return

    setError('')
    startTransition(async () => {
      try {
        await createTaskFromCapture(captureId, {
          title: title.trim(),
          domain: domain as 'work' | 'personal',
          energy: energy as 'deep' | 'admin',
          dueDate: dueDate || null,
          details: details || null,
        })
        onSuccess()
      } catch {
        setError('Failed to save — try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title"
        autoFocus
        className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
      />

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Domain</p>
        <div className="flex gap-2">
          {(['work', 'personal'] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                domain === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 active:bg-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Energy</p>
        <div className="flex gap-2">
          {(['deep', 'admin'] as const).map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEnergy(e)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                energy === e
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 active:bg-gray-700'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Due date (optional)</p>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full bg-gray-800 text-gray-300 px-3 py-2.5 rounded-lg text-sm focus:outline-none"
          style={{ colorScheme: 'dark' }}
        />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Notes (optional)</p>
        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          rows={3}
          className="w-full bg-gray-800 text-gray-300 px-3 py-2.5 rounded-lg text-sm focus:outline-none resize-none placeholder-gray-600"
          placeholder="Context, links, acceptance criteria…"
        />
      </div>

      {error && <p role="alert" className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 py-2.5 bg-blue-600 active:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-40 text-sm transition-colors"
        >
          {isPending ? 'Saving…' : 'Save Task'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2.5 bg-gray-800 active:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
