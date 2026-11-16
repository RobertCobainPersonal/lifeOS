'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCloseout } from '@/app/today/actions'

interface CloseoutFormProps {
  prompts: string[]
  savedAnswers: string[]
  tomorrowOptions: { id: string; title: string }[]
  savedTomorrowId: string | null
}

/** Every field is optional: closing the day with nothing written is fine. */
export default function CloseoutForm({
  prompts,
  savedAnswers,
  tomorrowOptions,
  savedTomorrowId,
}: CloseoutFormProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState(prompts.map((_, i) => savedAnswers[i] ?? ''))
  const [tomorrowId, setTomorrowId] = useState(savedTomorrowId ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await saveCloseout(answers, tomorrowId || null)
        router.push('/today')
      } catch {
        setError('Could not save — try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {prompts.map((prompt, i) => (
        <label key={i} className="block">
          <span className="text-sm text-gray-300">{prompt}</span>
          <textarea
            value={answers[i]}
            onChange={e => setAnswers(prev => prev.map((a, j) => (j === i ? e.target.value : a)))}
            rows={3}
            maxLength={2000}
            className="mt-1 w-full bg-gray-900 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </label>
      ))}

      {tomorrowOptions.length > 0 && (
        <label className="block">
          <span className="text-sm text-gray-300">Tomorrow&rsquo;s one thing (optional)</span>
          <select
            value={tomorrowId}
            onChange={e => setTomorrowId(e.target.value)}
            className="mt-1 w-full bg-gray-900 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Decide in the morning</option>
            {tomorrowOptions.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Close the day'}
      </button>
    </form>
  )
}
