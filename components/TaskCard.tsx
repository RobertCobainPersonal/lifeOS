'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { completeTask, addToTop3, removeFromTop3, updateTask } from '@/app/tasks/actions'

interface TaskCardProps {
  id: string
  title: string
  domain: 'work' | 'personal' | null
  energy: 'deep' | 'admin' | null
  dueDate: string | null
  details: string | null
  isTop3Today: boolean
  top3Count: number
}

export default function TaskCard({
  id,
  title,
  domain,
  energy,
  dueDate,
  details,
  isTop3Today,
  top3Count,
}: TaskCardProps) {
  const [done, setDone] = useState(false)
  const [top3, setTop3] = useState(isTop3Today)
  const [top3Error, setTop3Error] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editDomain, setEditDomain] = useState(domain)
  const [editEnergy, setEditEnergy] = useState(energy)
  const [editDueDate, setEditDueDate] = useState(dueDate ?? '')
  const [editDetails, setEditDetails] = useState(details ?? '')
  const [isPending, startTransition] = useTransition()

  function handleComplete() {
    setDone(true)
    startTransition(async () => {
      try {
        await completeTask(id)
      } catch {
        setDone(false)
      }
    })
  }

  function handleTop3() {
    setTop3Error('')
    if (top3) {
      setTop3(false)
      startTransition(async () => {
        try {
          await removeFromTop3(id)
        } catch {
          setTop3(true)
        }
      })
    } else {
      if (top3Count >= 3) {
        setTop3Error('Top 3 is full — remove one first')
        setTimeout(() => setTop3Error(''), 2500)
        return
      }
      setTop3(true)
      startTransition(async () => {
        try {
          await addToTop3(id)
        } catch (e) {
          setTop3(false)
          setTop3Error(e instanceof Error ? e.message : 'Failed')
        }
      })
    }
  }

  function handleSaveEdit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!editTitle.trim()) return
    startTransition(async () => {
      try {
        await updateTask(id, {
          title: editTitle.trim(),
          domain: editDomain,
          energy: editEnergy,
          dueDate: editDueDate || null,
          details: editDetails || null,
        })
        setEditing(false)
      } catch {
        // keep form open on error
      }
    })
  }

  function cancelEdit() {
    setEditTitle(title)
    setEditDomain(domain)
    setEditEnergy(energy)
    setEditDueDate(dueDate ?? '')
    setEditDetails(details ?? '')
    setEditing(false)
  }

  if (done) return null

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = dueDate && dueDate < today

  if (editing) {
    return (
      <div className="py-3.5 border-b border-gray-800 last:border-0">
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            autoFocus
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Task title"
          />

          {/* Details */}
          <textarea
            value={editDetails}
            onChange={e => setEditDetails(e.target.value)}
            rows={3}
            className="w-full bg-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder-gray-600"
            placeholder="Notes, context, links…"
          />

          {/* Domain toggle */}
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-xs w-14 shrink-0">Domain</span>
            {(['work', 'personal'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setEditDomain(editDomain === d ? null : d)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  editDomain === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Energy toggle */}
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-xs w-14 shrink-0">Energy</span>
            {(['deep', 'admin'] as const).map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEditEnergy(editEnergy === e ? null : e)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  editEnergy === e
                    ? e === 'deep'
                      ? 'bg-purple-700 text-purple-100'
                      : 'bg-gray-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Due date */}
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-xs w-14 shrink-0">Due</span>
            <input
              type="date"
              value={editDueDate}
              onChange={e => setEditDueDate(e.target.value)}
              className="bg-gray-800 text-gray-300 px-2 py-1 rounded-lg text-sm focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
            {editDueDate && (
              <button
                type="button"
                onClick={() => setEditDueDate('')}
                className="text-gray-600 text-xs"
              >
                clear
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!editTitle.trim() || isPending}
              className="px-4 py-2 bg-blue-600 active:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="px-4 py-2 bg-gray-800 active:bg-gray-700 text-gray-400 text-sm rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-800 last:border-0">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 border-gray-600 active:border-green-500 active:bg-green-500/10 disabled:opacity-40 transition-colors"
        aria-label={`Mark "${title}" complete`}
      />
      <div className="flex-1 min-w-0">
        <Link href={`/tasks/${id}`} className="text-white text-base leading-snug active:text-gray-300 transition-colors">
          {title}
        </Link>
        {details && (
          <p className="text-gray-600 text-xs mt-0.5 truncate">{details}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {energy && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                energy === 'deep'
                  ? 'bg-purple-900/60 text-purple-300'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {energy}
            </span>
          )}
          {dueDate && (
            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
              {isOverdue ? 'overdue · ' : ''}
              {dueDate}
            </span>
          )}
          {top3Error && <span className="text-red-400 text-xs">{top3Error}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <button
          onClick={() => setEditing(true)}
          disabled={isPending}
          className="text-gray-500 active:text-gray-300 text-base px-1 disabled:opacity-40 transition-colors"
          aria-label={`Edit "${title}"`}
        >
          ✎
        </button>
        <button
          onClick={handleTop3}
          disabled={isPending}
          className={`text-xl disabled:opacity-40 transition-colors ${
            top3 ? 'text-yellow-400 active:text-gray-500' : 'text-gray-600 active:text-yellow-400'
          }`}
          aria-label={top3 ? `Remove "${title}" from Top 3` : `Add "${title}" to Top 3`}
        >
          {top3 ? '★' : '☆'}
        </button>
      </div>
    </div>
  )
}
