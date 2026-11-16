import { formatGap, londonClock, type CalendarEvent, type Gap } from '@/lib/calendar'

interface CalendarLineProps {
  next: CalendarEvent | null
  inProgress: boolean
  allDay: CalendarEvent[]
  gaps: Gap[]
  remaining: number
}

/** Today's calendar in a few lines: what's next, and where the free time is. */
export default function CalendarLine({ next, inProgress, allDay, gaps, remaining }: CalendarLineProps) {
  return (
    <section className="mb-6 bg-card ring-1 ring-line rounded-xl px-4 py-3 space-y-1.5" aria-label="Calendar">
      {allDay.length > 0 && (
        <p className="text-muted text-xs">{allDay.map(e => e.title).join(' · ')}</p>
      )}
      {next ? (
        <p className="text-ink text-sm leading-snug">
          <span className="text-muted">
            {inProgress ? `Now until ${londonClock(next.ends_at)}` : `Next ${londonClock(next.starts_at)}`}
          </span>{' '}
          <span className="font-medium">{next.title}</span>
          {next.location ? <span className="text-muted"> · {next.location}</span> : null}
          {remaining > 1 ? <span className="text-faint"> · {remaining - 1} more today</span> : null}
        </p>
      ) : (
        <p className="text-muted text-sm">No more meetings today.</p>
      )}
      {gaps.length > 0 && (
        <p className="text-muted text-sm leading-snug">
          Free {gaps.slice(0, 3).map(formatGap).join(' · ')}
        </p>
      )}
    </section>
  )
}
