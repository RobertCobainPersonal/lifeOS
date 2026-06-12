import Link from 'next/link'

interface BottomNavProps {
  current: 'today' | 'inbox' | 'tasks'
  inboxCount: number
}

export default function BottomNav({ current, inboxCount }: BottomNavProps) {
  const items = [
    { href: '/today', label: 'Today', key: 'today' as const },
    {
      href: '/inbox',
      label: 'Inbox',
      key: 'inbox' as const,
      badge: inboxCount > 0 ? inboxCount : null,
    },
    { href: '/tasks', label: 'Tasks', key: 'tasks' as const },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="flex h-14 max-w-lg mx-auto">
        {items.map(({ href, label, key, badge }) => {
          const active = current === key
          return (
            <Link
              key={key}
              href={href}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors ${
                active ? 'text-white' : 'text-gray-500 active:text-gray-300'
              }`}
            >
              {label}
              {badge != null && (
                <span className="bg-blue-600 text-white text-xs font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
