'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Section = 'today' | 'inbox' | 'fuel' | 'more'

interface BottomNavProps {
  current: Section
  inboxCount: number
}

const PHONE_ITEMS: { href: string; label: string; key: Section }[] = [
  { href: '/today', label: 'Today', key: 'today' },
  { href: '/inbox', label: 'Inbox', key: 'inbox' },
  { href: '/fuel', label: 'Fuel', key: 'fuel' },
  { href: '/more', label: 'More', key: 'more' },
]

const DESKTOP_ITEMS: { href: string; label: string }[] = [
  { href: '/today', label: 'Today' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/projects', label: 'Projects' },
  { href: '/time', label: 'Time' },
  { href: '/fuel', label: 'Fuel' },
  { href: '/record', label: 'Record' },
  { href: '/more', label: 'More' },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="bg-accent text-white text-xs font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** A bottom bar on phones; a left-hand sidebar on wide screens. */
export default function BottomNav({ current, inboxCount }: BottomNavProps) {
  const pathname = usePathname() ?? ''
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-line pb-[env(safe-area-inset-bottom)] lg:top-0 lg:right-auto lg:w-56 lg:border-t-0 lg:border-r lg:pb-0"
      aria-label="Main navigation"
    >
      <div className="flex h-14 max-w-lg mx-auto lg:hidden">
        {PHONE_ITEMS.map(({ href, label, key }) => {
          const active = current === key
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors ${
                active ? 'text-accent-ink' : 'text-faint active:text-ink-soft'
              }`}
            >
              {label}
              {key === 'inbox' && <Badge count={inboxCount} />}
            </Link>
          )
        })}
      </div>

      <div className="hidden lg:flex lg:flex-col lg:h-full lg:px-3 lg:py-5">
        <Link href="/today" className="px-3 pb-6 text-lg font-bold text-ink">
          LifeOS
        </Link>
        <div className="flex flex-col gap-0.5">
          {DESKTOP_ITEMS.map(({ href, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-accent-soft text-accent-ink' : 'text-ink-soft hover:bg-sunk'
                }`}
              >
                {label}
                {href === '/inbox' && <Badge count={inboxCount} />}
              </Link>
            )
          })}
        </div>
        <Link
          href="/settings"
          aria-current={isActive('/settings') ? 'page' : undefined}
          className={`mt-auto rounded-lg px-3 py-2 text-sm font-medium ${
            isActive('/settings') ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-sunk'
          }`}
        >
          Settings
        </Link>
      </div>
    </nav>
  )
}
