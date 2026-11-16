import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

export default async function MorePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const settings = await supabase.from('settings').select('slipping_days').eq('id', 1).single()
  const now = new Date()
  const threshold = new Date(now.getTime() - (settings.data?.slipping_days ?? 5) * 86_400_000)

  const [inbox, slipping] = await Promise.all([
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .lt('last_touched_at', threshold.toISOString()),
  ])
  const slippingCount = slipping.count ?? 0

  const links: { href: string; label: string; note?: string }[] = [
    { href: '/tasks', label: 'Tasks' },
    { href: '/clickup', label: 'Work (ClickUp)' },
    { href: '/slipping', label: 'Slipping', note: slippingCount > 0 ? String(slippingCount) : undefined },
    { href: '/time', label: 'Track time' },
    { href: '/record', label: 'Record' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-6">More</h1>
        <div className="flex flex-col gap-3">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-4 active:bg-gray-800 transition-colors"
            >
              <span className="text-white font-medium">{link.label}</span>
              <span className="text-gray-600 text-sm tabular-nums">{link.note ?? '→'}</span>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
