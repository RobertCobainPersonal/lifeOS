const TZ = 'Europe/London'

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const hourFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  hourCycle: 'h23',
})

/** YYYY-MM-DD for an instant, as seen in Europe/London. */
export function londonDate(d: Date): string {
  return dayFmt.format(d)
}

export function londonToday(now: Date = new Date()): string {
  return londonDate(now)
}

/** London wall-clock hour (0-23) for an instant. */
export function londonHour(d: Date): number {
  return parseInt(hourFmt.format(d), 10)
}

/** Calendar arithmetic on a YYYY-MM-DD string. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

/** UTC ISO instant at which the given London day starts. */
export function londonDayStartIso(day: string): string {
  const utcMidnight = new Date(`${day}T00:00:00.000Z`)
  // London is UTC+0 or UTC+1, so its midnight is utcMidnight or one hour earlier.
  const oneHourEarlier = new Date(utcMidnight.getTime() - 3600_000)
  const start = londonDate(oneHourEarlier) === day ? oneHourEarlier : utcMidnight
  return start.toISOString()
}
