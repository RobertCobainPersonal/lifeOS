'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cleanCode } from '@/lib/auth'

function AuthForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [verifying, setVerifying] = useState(false)
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
      setError(
        error.status === 429
          ? 'Too many emails requested. Wait a while, then try again, or use the last code you were sent.'
          : error.message
      )
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  async function handleVerify(e: { preventDefault(): void }) {
    e.preventDefault()
    const cleaned = cleanCode(code)
    if (!cleaned) {
      setCodeError('Enter the code from the email, digits only.')
      return
    }
    setVerifying(true)
    setCodeError('')
    const supabase = createClient()
    // Verified here, in the tab that asked for it: nothing has to cross between browsers
    const { error } = await supabase.auth.verifyOtp({ email, token: cleaned, type: 'email' })
    if (error) {
      setCodeError('That code did not work. Check it, or request a new one.')
      setVerifying(false)
      return
    }
    // Full load so the server sees the new session
    window.location.assign('/today')
  }

  if (sent) {
    return (
      <form onSubmit={handleVerify} className="w-full max-w-sm px-6 text-ink" noValidate>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-muted mb-6 text-sm">
          We sent a sign-in code to {email}. Type it here.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={e => { setCode(e.target.value); if (codeError) setCodeError('') }}
          placeholder="Code"
          aria-label="Sign-in code"
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-sunk text-ink border border-line-strong focus:border-accent focus:outline-none mb-4 text-2xl tracking-widest text-center tabular-nums"
        />
        {codeError && (
          <p role="alert" className="text-red-700 text-sm mb-4">{codeError}</p>
        )}
        <button
          type="submit"
          disabled={verifying}
          className="w-full py-3 rounded-xl bg-accent active:bg-accent-strong text-white font-semibold text-lg disabled:opacity-50 transition-colors"
        >
          {verifying ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-faint text-xs mt-4">
          The link in the email also works if you open it in this same browser.
        </p>
        <button
          type="button"
          onClick={() => { setSent(false); setEmail(''); setCode(''); setCodeError('') }}
          className="text-sm text-muted underline mt-4"
        >
          Use a different email
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
      <h1 className="text-3xl font-bold text-ink mb-2">LifeOS</h1>
      <p className="text-muted mb-8 text-sm">Your trusted life system</p>
      {error && (
        <p className="text-red-700 text-sm mb-4">{error}</p>
      )}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        autoFocus
        className="w-full px-4 py-3 rounded-xl bg-sunk text-ink border border-line-strong focus:border-accent focus:outline-none mb-4 text-lg"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-accent active:bg-accent-strong text-white font-semibold text-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'Sending…' : 'Email me a sign-in code'}
      </button>
      <button
        type="button"
        onClick={() => {
          if (!email.trim()) {
            setError('Enter your email first.')
            return
          }
          setError('')
          setSent(true)
        }}
        className="w-full mt-3 py-2 text-sm text-muted active:text-ink-soft"
      >
        I already have a code
      </button>
    </form>
  )
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  )
}
