import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Today</h1>
      <p className="text-gray-500 text-sm mb-8">Session 1 complete ✓</p>
      <p className="text-gray-400 text-sm">
        Signed in as {user.email}
      </p>
    </div>
  )
}
