'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ClickupRefreshButton() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 3000)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="text-gray-500 text-sm active:text-gray-300 disabled:opacity-40 transition-colors"
      aria-label="Refresh ClickUp tasks"
    >
      {refreshing ? '↻ Syncing…' : '↻ Refresh'}
    </button>
  )
}
