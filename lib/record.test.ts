import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import {
  MIN_DAYS,
  freeWindows,
  hotSpots,
  hourGrid,
  sentences,
  sleepSplit,
  trackedDayCount,
  trainingSplit,
  weekSummary,
} from './record'
import type { TimeEntry } from './types'

const now = new Date('2026-11-30T20:00:00Z')

let seq = 0
function entry(
  day: string,
  startHour: number,
  minutes: number,
  over: Partial<TimeEntry> = {}
): TimeEntry {
  const start = new Date(`${day}T${String(startHour).padStart(2, '0')}:00:00Z`)
  return {
    id: `e${seq++}`,
    day,
    mode: 'track',
    category: 'meetings',
    activity_id: null,
    energy: null,
    task_id: null,
    clickup_id: null,
    label: null,
    planned_minutes: null,
    started_at: start.toISOString(),
    ended_at: new Date(start.getTime() + minutes * 60_000).toISOString(),
    paused_at: null,
    paused_seconds: 0,
    distractions: 0,
    done_note: null,
    next_note: null,
    ...over,
  }
}
const focus = (day: string, hour: number, minutes: number, over: Partial<TimeEntry> = {}) =>
  entry(day, hour, minutes, { mode: 'focus', category: 'deep_work', planned_minutes: minutes, ...over })

const week = Array.from({ length: 7 }, (_, i) => addDays('2026-11-16', i))
const empty = { days: week, entries: [], food: [], logs: [], now }

describe('weekSummary', () => {
  it('totals focus minutes from focus entries only', () => {
    const s = weekSummary({
      ...empty,
      entries: [focus('2026-11-16', 9, 25), focus('2026-11-17', 9, 50), entry('2026-11-16', 11, 30)],
    })
    expect(s.focusMinutes).toBe(75)
    expect(s.minutesByCategory).toEqual({ deep_work: 75, meetings: 30 })
  })
  it('ignores entries outside the week', () => {
    expect(weekSummary({ ...empty, entries: [focus('2026-11-09', 9, 25)] }).focusMinutes).toBe(0)
  })
  it('has no average energy when nothing was rated', () => {
    expect(weekSummary({ ...empty, entries: [focus('2026-11-16', 9, 25)] }).avgEnergy).toBeNull()
  })
  it('averages energy over rated entries', () => {
    const s = weekSummary({
      ...empty,
      entries: [
        focus('2026-11-16', 9, 25, { energy: 4 }),
        entry('2026-11-16', 11, 30, { energy: 2 }),
        entry('2026-11-16', 13, 30),
      ],
    })
    expect(s.avgEnergy).toBe(3)
  })
  it('counts an unfinished entry at its capped time', () => {
    const s = weekSummary({
      ...empty,
      entries: [focus('2026-11-16', 9, 50, { ended_at: null })],
    })
    expect(s.focusMinutes).toBe(240)
  })
  it('counts food days, closed days and distractions', () => {
    const s = weekSummary({
      ...empty,
      entries: [focus('2026-11-16', 9, 25, { distractions: 3 })],
      food: [
        { day: '2026-11-16' },
        { day: '2026-11-16' },
        { day: '2026-11-18' },
        { day: '2026-11-01' },
      ],
      logs: [
        { day: '2026-11-16', closed_at: '2026-11-16T18:00:00Z' },
        { day: '2026-11-17', closed_at: null },
      ],
    })
    expect(s).toMatchObject({ distractions: 3, foodDaysLogged: 2, daysClosed: 1 })
  })
})

describe('hourGrid', () => {
  it('always has 24 rows', () => {
    const grid = hourGrid([], now)
    expect(grid).toHaveLength(24)
    expect(grid[0]).toEqual({ hour: 0, minutes: {} })
    expect(grid[23].hour).toBe(23)
  })
  it('puts minutes in the London hour they happened', () => {
    const grid = hourGrid([entry('2026-11-16', 9, 90)], now)
    expect(grid[9].minutes).toEqual({ meetings: 60 })
    expect(grid[10].minutes).toEqual({ meetings: 30 })
  })
})

describe('hourGrid keys', () => {
  it('groups by the key it is given', () => {
    const grid = hourGrid([entry('2026-11-16', 9, 30)], now, () => 'work')
    expect(grid[9].minutes).toEqual({ work: 30 })
  })
})

describe('hotSpots', () => {
  const proc = (hour: number, minutes: number) =>
    entry('2026-11-16', hour, minutes, { category: 'procrastinating' })
  it('ranks the hours with most procrastinating time', () => {
    const grid = hourGrid([proc(14, 40), proc(15, 10), proc(11, 25), proc(9, 5)], now)
    expect(hotSpots(grid)).toEqual([14, 11, 15])
  })
  it('is empty when there is none', () => {
    expect(hotSpots(hourGrid([entry('2026-11-16', 9, 30)], now))).toEqual([])
  })
})

describe('freeWindows', () => {
  const days = (n: number) => Array.from({ length: n }, (_, i) => addDays('2026-11-01', i))
  const tracked = (n: number, extra: (day: string) => TimeEntry[] = () => []) =>
    days(n).flatMap(day => [entry(day, 10, 30), ...extra(day)])

  it('says nothing on fewer than fourteen tracked days', () => {
    expect(MIN_DAYS).toBe(14)
    expect(freeWindows(tracked(13), days(13), now)).toEqual([])
  })
  it('never offers working hours', () => {
    const windows = freeWindows(tracked(14), days(14), now)
    expect(windows.length).toBeGreaterThan(0)
    expect(windows.every(w => w.hour < 8 || w.hour >= 18)).toBe(true)
    expect(windows.every(w => w.hour >= 6 && w.hour < 22)).toBe(true)
  })
  it('ranks an hour that is always busy below one that is always free', () => {
    const busyAt19 = (day: string) => [entry(day, 19, 60, { category: 'personal_project' })]
    const windows = freeWindows(tracked(14, busyAt19), days(14), now)
    expect(windows.find(w => w.hour === 19)).toBeUndefined()
    expect(windows[0].freeShare).toBe(1)
    expect(windows).toHaveLength(5)
  })
  it('treats rest as free time', () => {
    const restAt19 = (day: string) => [entry(day, 19, 60, { category: 'rest' })]
    const windows = freeWindows(tracked(14, restAt19), days(14), now)
    expect(windows.find(w => w.hour === 19)?.freeShare).toBe(1)
  })
})

describe('trainingSplit', () => {
  const days = (n: number) => Array.from({ length: n }, (_, i) => addDays('2026-11-01', i))
  // focus every day: 60 min after a training day, 30 min otherwise; training on even-numbered days
  const build = (n: number) => {
    const d = days(n)
    const activities = d.filter((_, i) => i % 2 === 0).map(day => ({ day }))
    const trained = new Set(activities.map(a => a.day))
    const entries = d.map(day => focus(day, 9, trained.has(addDays(day, -1)) ? 60 : 30))
    return { entries, activities, days: d, now }
  }
  it('needs fourteen days with focus', () => {
    expect(trainingSplit(build(13))).toBeNull()
  })
  it('compares days after training with days after rest', () => {
    expect(trainingSplit(build(14))).toEqual({ afterTraining: 60, afterRest: 30 })
  })
  it('is null when every day follows training', () => {
    const input = build(14)
    expect(trainingSplit({ ...input, activities: [addDays('2026-11-01', -1), ...input.days].map(day => ({ day })) })).toBeNull()
  })
})

describe('sentences', () => {
  const base = {
    focusMinutes: 150,
    minutesByCategory: { deep_work: 150, meetings: 90 },
    distractions: 4,
    foodDaysLogged: 3,
    daysClosed: 2,
    avgEnergy: 3.5,
  }
  const none = {
    focusMinutes: 0,
    minutesByCategory: {},
    distractions: 0,
    foodDaysLogged: 0,
    daysClosed: 0,
    avgEnergy: null,
  }
  it('states the week plainly', () => {
    const text = sentences(base, none).join(' ')
    expect(text).toContain('2h 30m')
    expect(text).toContain('Meetings')
  })
  it('compares with last week only when last week has data', () => {
    expect(sentences(base, none).join(' ')).not.toMatch(/last week/i)
    expect(sentences(base, { ...none, focusMinutes: 90, minutesByCategory: { deep_work: 90 } }).join(' ')).toMatch(
      /1h more than last week/i
    )
  })
  it('never scolds', () => {
    const text = [...sentences(base, none), ...sentences(none, base)].join(' ')
    expect(text).not.toMatch(/streak|missed|failed|only|should/i)
  })
  it('says something calm for an empty week', () => {
    expect(sentences(none, none)).toEqual(['Nothing logged this week yet.'])
  })
  it('names activities with the labels it is given', () => {
    const hockey = { ...none, minutesByCategory: { hockey: 180 } }
    expect(sentences(hockey, none, key => (key === 'hockey' ? 'Hockey' : key)).join(' ')).toMatch(
      'Most time went on Hockey (3h)'
    )
  })
})

describe('trackedDayCount', () => {
  it('counts distinct days that have any entry', () => {
    expect(
      trackedDayCount([entry('2026-11-16', 9, 30), entry('2026-11-16', 11, 30), entry('2026-11-17', 9, 30)])
    ).toBe(2)
    expect(trackedDayCount([])).toBe(0)
  })
})

describe('sleepSplit', () => {
  const days = (n: number) => Array.from({ length: n }, (_, i) => addDays('2026-11-01', i))
  // sleep recorded for each day; the following day has 60 min focus after 7h+ and 30 min after less
  const build = (n: number) => {
    const d = days(n)
    const health = d.map((day, i) => ({ day, sleep_minutes: i % 2 === 0 ? 450 : 360 }))
    const good = new Set(health.filter(h => h.sleep_minutes >= 420).map(h => h.day))
    const entries = d.slice(1).map(day => focus(day, 9, good.has(addDays(day, -1)) ? 60 : 30))
    return { entries, health, days: d, now }
  }
  it('needs fourteen days with both sleep and focus', () => {
    expect(sleepSplit(build(14))).toBeNull() // only 13 following days
  })
  it('compares focus after seven hours or more with focus after less', () => {
    expect(sleepSplit(build(15))).toEqual({ afterLonger: 60, afterShorter: 30, thresholdMinutes: 420 })
  })
  it('skips nights with no sleep figure', () => {
    const input = build(15)
    expect(sleepSplit({ ...input, health: input.health.map(h => ({ ...h, sleep_minutes: null })) })).toBeNull()
  })
})

describe('splits need enough days on both sides', () => {
  const days = Array.from({ length: 16 }, (_, i) => addDays('2026-11-01', i))
  it('says nothing about training when only one day followed training', () => {
    const entries = days.map(day => focus(day, 9, 30))
    expect(trainingSplit({ entries, activities: [{ day: '2026-11-03' }], days, now })).toBeNull()
  })
  it('says nothing about sleep when only one night was short', () => {
    const health = days.map((day, i) => ({ day, sleep_minutes: i === 3 ? 300 : 450 }))
    const entries = days.slice(1).map(day => focus(day, 9, 30))
    expect(sleepSplit({ entries, health, days, now })).toBeNull()
  })
})
