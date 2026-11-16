'use client'

import { useEffect, useState } from 'react'

/**
 * A clock that ticks every second and catches up when the tab or phone wakes.
 * Starts from the server's time so the first render matches.
 */
export function useNow(serverNowMs: number): Date {
  const [nowMs, setNowMs] = useState(serverNowMs)

  useEffect(() => {
    const tick = () => setNowMs(Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [])

  return new Date(nowMs)
}
