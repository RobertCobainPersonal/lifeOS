'use client'

import { useState } from 'react'
import { formatGap, londonClock, type CalendarEvent, type Gap } from '@/lib/calendar'
import AddEventForm from '@/components/AddEventForm'
import RemoveEventButton from '@/components/RemoveEventButton'

interface CalendarCardProps {
  events: CalendarEvent[]
  next: CalendarEvent | null
  inProgress: boolean
  gaps: Gap[]
  remaining: number
  today: string
  /** Show the full list straight away (wide screens). */
  expanded?: boolean
}

/** Today's calendar: next meeting, free time, the full list on demand, and Add event. */
export default function CalendarCard({
  events,
  next,
  inProgress,
  gaps,
  remaining,
  today,
  expanded = false,
}: CalendarCardProps) {
  const [showList, setShowList] = useState(expanded)
  const [adding, setAdding] = useState(false)
  const allDay = events.filter(e => e.all_day)
  const listVisible = showList || expanded

  return (
    <section className="mb-6 bg-card ring-1 ring-line rounded-xl px-4 py-3" aria-label="Calendar">
      <div className="space-y-1.5">
        {allDay.length > 0 && !listVisible && (
          <p className="text-muted text-xs">{allDay.map(e => e.title).join(' · ')}</p>
        )}
        {events.length === 0 ? (
          <p className="text-muted text-sm">Nothing in the calendar today.</p>
        ) : next ? (
          <p className="text-ink text-sm leading-snug">
            <span className="text-muted">
              {inProgress ? `Now until ${londonClock(next.ends_at)}` : `Next ${londonClock(next.starts_at)}`}
            </span>{' '}
            <span className="font-medium">{next.title}</span>
            {next.location ? <span className="text-muted"> · {next.location}</span> : null}
            {remaining > 1 && !listVisible ? <span className="text-faint"> · {remaining - 1} more today</span> : null}
          </p>
        ) : (
          <p className="text-muted text-sm">No more meetings today.</p>
        )}
        {gaps.length > 0 && events.length > 0 && (
          <p className="text-muted text-sm leading-snug">Free {gaps.slice(0, 3).map(formatGap).join(' · ')}</p>
        )}
      </div>

      {listVisible && events.length > 0 && (
        <div className="mt-3 border-t border-line">
          {events.map(e => (
            <div key={`${e.source}:${e.source_id}`} className="flex items-start gap-3 py-2 border-b border-line last:border-0 text-sm">
              <span className="shrink-0 w-24 text-muted tabular-nums">
                {e.all_day ? 'All day' : `${londonClock(e.starts_at)}–${londonClock(e.ends_at)}`}
              </span>
              <span className="flex-1 text-ink leading-snug">
                {e.title}
                {e.location ? <span className="text-muted"> · {e.location}</span> : null}
              </span>
              {e.source === 'manual' && <RemoveEventButton sourceId={e.source_id} title={e.title} />}
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <AddEventForm today={today} onDone={() => setAdding(false)} />
      ) : (
        <div className="flex items-center gap-4 mt-2">
          <button onClick={() => setAdding(true)} className="text-accent-ink text-sm font-medium py-1">
            + Add event
          </button>
          {!expanded && events.length > 0 && (
            <button onClick={() => setShowList(s => !s)} className="text-muted text-sm py-1 active:text-ink-soft">
              {showList ? 'Hide day' : 'Show day'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
