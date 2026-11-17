'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeReview } from '@/app/review/actions'

export default function CompleteReviewButton() {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()
  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => {
            setError(false)
            try {
              await completeReview()
              router.push('/today')
            } catch {
              setError(true)
            }
          })
        }
        disabled={isPending}
        className="w-full py-3.5 bg-accent active:bg-accent-strong text-white font-semibold rounded-xl disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Done for this week'}
      </button>
      {error && (
        <p role="alert" className="text-red-700 text-sm mt-2">
          Could not save — try again
        </p>
      )}
    </div>
  )
}
