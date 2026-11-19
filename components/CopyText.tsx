'use client'

import { useState } from 'react'

/** Copies the given text to the clipboard. */
export default function CopyText({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }
  return (
    <button onClick={copy} className="text-sm text-accent-ink px-2 py-1 active:opacity-70" aria-live="polite">
      {state === 'copied' ? 'Copied ✓' : state === 'failed' ? 'Copy failed' : label}
    </button>
  )
}
