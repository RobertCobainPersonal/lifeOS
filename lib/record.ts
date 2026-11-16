import { addDays } from '@/lib/dates'
import { summariseEntries } from '@/lib/closeout'
import { CATEGORIES, splitByHour } from '@/lib/time'
import type { Category, TimeEntry } from '@/lib/types'

/** Comparisons and patterns stay hidden until there are this many days behind them. */
export const MIN_DAYS = 14
export const WORK_HOURS = { start: 8, end: 18 }
const WAKING_HOURS = { start: 6, end: 22 }

export interface WeekSummary {
  focusMinutes: number
  minutesByCategory: Partial<Record<Category, number>>
  distractions: number
  foodDaysLogged: number
  daysClosed: number
  avgEnergy: number | null
}

export function weekSummary(input: {
  days: string[]
  entries: TimeEntry[]
  food: { day: string }[]
  logs: { day: string; closed_at: string | null }[]
  now: Date
}): WeekSummary {
  const inWeek = new Set(input.days)
  const entries = input.entries.filter(e => inWeek.has(e.day))
  const totals = summariseEntries(entries, input.now)
  const rated = entries.filter(e => e.energy !== null)

  return {
    focusMinutes: totals.focusMinutes,
    minutesByCategory: totals.minutesByCategory,
    distractions: totals.distractions,
    foodDaysLogged: new Set(input.food.filter(f => inWeek.has(f.day)).map(f => f.day)).size,
    daysClosed: input.logs.filter(l => inWeek.has(l.day) && l.closed_at !== null).length,
    avgEnergy:
      rated.length === 0
        ? null
        : Math.round((rated.reduce((sum, e) => sum + (e.energy ?? 0), 0) / rated.length) * 10) / 10,
  }
}

export type HourRow = { hour: number; minutes: Partial<Record<Category, number>> }

/** Minutes per category for each London hour of the day. Always 24 rows. */
export function hourGrid(entries: TimeEntry[], now: Date): HourRow[] {
  const seconds: Partial<Record<Category, number>>[] = Array.from({ length: 24 }, () => ({}))
  for (const e of entries) {
    for (const part of splitByHour(e, now)) {
      seconds[part.hour][e.category] = (seconds[part.hour][e.category] ?? 0) + part.seconds
    }
  }
  return seconds.map((row, hour) => {
    const minutes: Partial<Record<Category, number>> = {}
    for (const [category, s] of Object.entries(row) as [Category, number][]) {
      const m = Math.round(s / 60)
      if (m > 0) minutes[category] = m
    }
    return { hour, minutes }
  })
}

/** Up to three hours where procrastinating most often lands, most first. */
export function hotSpots(grid: HourRow[]): number[] {
  return grid
    .filter(row => (row.minutes.procrastinating ?? 0) > 0)
    .sort((a, b) => (b.minutes.procrastinating ?? 0) - (a.minutes.procrastinating ?? 0))
    .slice(0, 3)
    .map(row => row.hour)
}

/**
 * Hours outside the working day that are usually untracked or rest,
 * as a share of the days on which anything was tracked.
 */
export function freeWindows(
  entries: TimeEntry[],
  days: string[],
  now: Date
): { hour: number; freeShare: number }[] {
  const inRange = new Set(days)
  const trackedDays = new Set<string>()
  const busy = new Map<number, Set<string>>()

  for (const e of entries) {
    for (const part of splitByHour(e, now)) {
      if (!inRange.has(part.day)) continue
      trackedDays.add(part.day)
      if (e.category === 'rest') continue
      if (!busy.has(part.hour)) busy.set(part.hour, new Set())
      busy.get(part.hour)!.add(part.day)
    }
  }
  if (trackedDays.size < MIN_DAYS) return []

  const windows: { hour: number; freeShare: number }[] = []
  for (let hour = WAKING_HOURS.start; hour < WAKING_HOURS.end; hour++) {
    if (hour >= WORK_HOURS.start && hour < WORK_HOURS.end) continue
    const freeShare = 1 - (busy.get(hour)?.size ?? 0) / trackedDays.size
    if (freeShare >= 0.5) windows.push({ hour, freeShare: Math.round(freeShare * 100) / 100 })
  }
  return windows.sort((a, b) => b.freeShare - a.freeShare || a.hour - b.hour).slice(0, 5)
}

/**
 * Mean focus minutes on days that follow a training day versus days that
 * follow a rest day, over days with any focus. Null until there is enough to say.
 */
export function trainingSplit(input: {
  entries: TimeEntry[]
  activities: { day: string }[]
  days: string[]
  now: Date
}): { afterTraining: number; afterRest: number } | null {
  const inRange = new Set(input.days)
  const trained = new Set(input.activities.map(a => a.day))
  const focusByDay = new Map<string, TimeEntry[]>()
  for (const e of input.entries) {
    if (e.mode !== 'focus' || !inRange.has(e.day)) continue
    focusByDay.set(e.day, [...(focusByDay.get(e.day) ?? []), e])
  }
  if (focusByDay.size < MIN_DAYS) return null

  const after: number[] = []
  const rest: number[] = []
  for (const [day, dayEntries] of focusByDay) {
    const minutes = summariseEntries(dayEntries, input.now).focusMinutes
    ;(trained.has(addDays(day, -1)) ? after : rest).push(minutes)
  }
  if (after.length === 0 || rest.length === 0) return null

  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
  return { afterTraining: mean(after), afterRest: mean(rest) }
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** The week in plain sentences. Describes; never judges. */
export function sentences(current: WeekSummary, previous: WeekSummary): string[] {
  const categories = (Object.entries(current.minutesByCategory) as [Category, number][]).sort(
    (a, b) => b[1] - a[1]
  )
  if (categories.length === 0 && current.foodDaysLogged === 0 && current.daysClosed === 0) {
    return ['Nothing logged this week yet.']
  }

  const out: string[] = []

  if (current.focusMinutes > 0) {
    let line = `You focused for ${formatMinutes(current.focusMinutes)}`
    if (previous.focusMinutes > 0) {
      const diff = current.focusMinutes - previous.focusMinutes
      line +=
        diff === 0
          ? ', the same as last week'
          : `, ${formatMinutes(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than last week`
    }
    out.push(`${line}.`)
  }

  if (categories.length > 0) {
    const parts = categories
      .slice(0, 3)
      .map(([category, minutes]) => `${CATEGORIES[category].label} (${formatMinutes(minutes)})`)
    out.push(`Most time went on ${parts.join(', then ')}.`)
  }

  if (current.distractions > 0) {
    out.push(
      `You logged ${current.distractions} distraction${current.distractions === 1 ? '' : 's'} during focus.`
    )
  }
  if (current.avgEnergy !== null) out.push(`Average energy was ${current.avgEnergy} out of 5.`)
  if (current.foodDaysLogged > 0) {
    out.push(`Food was logged on ${current.foodDaysLogged} day${current.foodDaysLogged === 1 ? '' : 's'}.`)
  }
  if (current.daysClosed > 0) {
    out.push(`You closed the day ${current.daysClosed} time${current.daysClosed === 1 ? '' : 's'}.`)
  }
  return out
}
