'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface QuickAddProps {
  inboxCount: number
}

export default function QuickAdd({ inboxCount }: QuickAddProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!value.trim()) return

    setError('')
    const supabase = createClient()
    const { error: insertError } = await supabase.from('captures').insert({
      raw_text: value.trim(),
      source: 'manual',
    })

    if (insertError) {
      setError('Failed to save — try again')
      return
    }

    setValue('')
    router.refresh()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:static sm:mb-6 bg-gray-900 border-t border-gray-800 sm:border sm:rounded-xl px-4 py-3 sm:px-4 sm:py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Capture a thought…"
          autoComplete="off"
          className="flex-1 bg-transparent text-white placeholder-gray-500 text-base focus:outline-none"
        />
        {inboxCount > 0 && (
          <span className="text-xs text-gray-500 shrink-0 tabular-nums">
            {inboxCount} in inbox
          </span>
        )}
      </form>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
