'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface QuickAddProps {
  inboxCount: number
  /** Sit above the bottom navigation instead of at the screen edge. */
  aboveNav?: boolean
}

export default function QuickAdd({ inboxCount, aboveNav = false }: QuickAddProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!value.trim() || isPending) return

    setError('')
    setIsPending(true)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('captures').insert({
      raw_text: value.trim(),
      source: 'manual',
    })
    setIsPending(false)

    if (insertError) {
      setError('Failed to save — try again')
      return
    }

    setValue('')
    router.refresh()
  }

  return (
    <div
      className={`fixed left-0 right-0 z-50 sm:static sm:mb-6 bg-card border-t border-line sm:border sm:rounded-xl px-4 py-3 ${
        aboveNav
          ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-3'
          : 'bottom-0 pb-[max(12px,env(safe-area-inset-bottom))]'
      }`}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); if (error) setError('') }}
          placeholder="Capture a thought…"
          autoComplete="off"
          disabled={isPending}
          className="flex-1 bg-transparent text-ink placeholder-faint text-base focus:outline-none"
        />
        {inboxCount > 0 && (
          <span className="text-xs text-muted shrink-0 tabular-nums">
            {inboxCount} in inbox
          </span>
        )}
        <button
          type="submit"
          disabled={!value.trim() || isPending}
          className="shrink-0 text-accent-ink disabled:text-faint text-sm font-medium transition-colors"
          aria-label="Capture"
        >
          ↑
        </button>
      </form>
      {error && <p role="alert" className="text-red-700 text-xs mt-1">{error}</p>}
    </div>
  )
}
