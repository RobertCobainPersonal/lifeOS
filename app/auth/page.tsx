'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    searchParams.get('error') === 'auth_failed' ? 'Link expired or already used — request a new one.' : ''
  )

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center text-white px-6">
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-gray-400 mb-6">Magic link sent to {email}</p>
        <button
          type="button"
          onClick={() => { setSent(false); setEmail('') }}
          className="text-sm text-gray-500 underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
      <h1 className="text-3xl font-bold text-white mb-2">LifeOS</h1>
      <p className="text-gray-500 mb-8 text-sm">Your trusted life system</p>
      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        autoFocus
        className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none mb-4 text-lg"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-semibold text-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  )
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  )
}
