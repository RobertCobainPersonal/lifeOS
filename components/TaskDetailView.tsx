'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTask, completeTask } from '@/app/tasks/actions'

interface TaskDetailViewProps {
  id: string
  title: string
  domain: 'work' | 'personal' | null
  energy: 'deep' | 'admin' | null
  dueDate: string | null
  details: string | null
}

export default function TaskDetailView({
  id,
  title,
  domain,
  energy,
  dueDate,
  details,
}: TaskDetailViewProps) {
  const router = useRouter()
  const [editTitle, setEditTitle] = useState(title)
  const [editDomain, setEditDomain] = useState(domain)
  const [editEnergy, setEditEnergy] = useState(energy)
  const [editDueDate, setEditDueDate] = useState(dueDate ?? '')
  const [editDetails, setEditDetails] = useState(details ?? '')
  const [isDirty, setIsDirty] = useState(false)
  const [saveLabel, setSaveLabel] = useState<'save' | 'saving' | 'saved'>('save')
  const [isPending, startTransition] = useTransition()

  function markDirty() {
    setIsDirty(true)
    if (saveLabel === 'saved') setSaveLabel('save')
  }

  function handleSave() {
    if (!editTitle.trim() || !isDirty) return
    setSaveLabel('saving')
    startTransition(async () => {
      try {
        await updateTask(id, {
          title: editTitle.trim(),
          domain: editDomain,
          energy: editEnergy,
          dueDate: editDueDate || null,
          details: editDetails || null,
        })
        setIsDirty(false)
        setSaveLabel('saved')
        setTimeout(() => setSaveLabel('save'), 2000)
      } catch {
        setSaveLabel('save')
      }
    })
  }

  function handleComplete() {
    startTransition(async () => {
      await completeTask(id)
      router.push('/tasks')
    })
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <input
        type="text"
        value={editTitle}
        onChange={e => { setEditTitle(e.target.value); markDirty() }}
        className="w-full bg-transparent text-white text-2xl font-bold focus:outline-none placeholder-gray-700 leading-tight"
        placeholder="Task title"
      />

      {/* Meta fields */}
      <div className="space-y-3 pb-4 border-b border-gray-800">
        <div className="flex gap-2 items-center">
          <span className="text-gray-600 text-xs w-14 shrink-0">Domain</span>
          {(['work', 'personal'] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => { setEditDomain(editDomain === d ? null : d); markDirty() }}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                editDomain === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-gray-600 text-xs w-14 shrink-0">Energy</span>
          {(['deep', 'admin'] as const).map(e => (
            <button
              key={e}
              type="button"
              onClick={() => { setEditEnergy(editEnergy === e ? null : e); markDirty() }}
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

        <div className="flex gap-2 items-center">
          <span className="text-gray-600 text-xs w-14 shrink-0">Due</span>
          <input
            type="date"
            value={editDueDate}
            onChange={e => { setEditDueDate(e.target.value); markDirty() }}
            className="bg-gray-800 text-gray-300 px-2 py-1 rounded-lg text-sm focus:outline-none"
            style={{ colorScheme: 'dark' }}
          />
          {editDueDate && (
            <button
              type="button"
              onClick={() => { setEditDueDate(''); markDirty() }}
              className="text-gray-600 text-xs"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="flex-1">
        <p className="text-xs text-gray-600 uppercase tracking-wide mb-3">Notes</p>
        <textarea
          value={editDetails}
          onChange={e => { setEditDetails(e.target.value); markDirty() }}
          rows={12}
          className="w-full bg-gray-900 text-gray-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-700 resize-none placeholder-gray-700 leading-relaxed"
          placeholder="Context, links, acceptance criteria, next steps…"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || !editTitle.trim() || isPending}
          className="flex-1 py-3 bg-blue-600 active:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
        >
          {saveLabel === 'saving' ? 'Saving…' : saveLabel === 'saved' ? 'Saved ✓' : 'Save changes'}
        </button>
        <button
          onClick={handleComplete}
          disabled={isPending}
          className="px-5 py-3 bg-gray-800 active:bg-gray-700 text-green-500 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
        >
          Done ✓
        </button>
      </div>
    </div>
  )
}
