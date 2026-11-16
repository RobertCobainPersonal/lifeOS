import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  MAX_ENTRY_SECONDS,
  elapsedSeconds,
  formatClock,
  parseTrackBody,
  remainingSeconds,
  splitByHour,
} from './time'

const e = {
  started_at: '2026-11-16T09:00:00Z',
  ended_at: null as string | null,
  paused_at: null as string | null,
  paused_seconds: 0,
}

describe('elapsedSeconds', () => {
  it('counts wall-clock time from the start', () => {
    expect(elapsedSeconds(e, new Date('2026-11-16T09:25:00Z'))).toBe(1500)
  })
  it('subtracts completed pauses', () => {
    expect(elapsedSeconds({ ...e, paused_seconds: 300 }, new Date('2026-11-16T09:25:00Z'))).toBe(1200)
  })
  it('stops counting while paused', () => {
    expect(
      elapsedSeconds({ ...e, paused_at: '2026-11-16T09:10:00Z' }, new Date('2026-11-16T09:25:00Z'))
    ).toBe(600)
  })
  it('caps an entry forgotten overnight at four hours', () => {
    expect(MAX_ENTRY_SECONDS).toBe(14400)
    expect(elapsedSeconds(e, new Date('2026-11-17T09:00:00Z'))).toBe(14400)
  })
  it('uses the end time once ended', () => {
    expect(
      elapsedSeconds({ ...e, ended_at: '2026-11-16T09:50:00Z' }, new Date('2026-11-16T12:00:00Z'))
    ).toBe(3000)
  })
  it('never goes negative on clock skew', () => {
    expect(elapsedSeconds(e, new Date('2026-11-16T08:59:00Z'))).toBe(0)
  })
})

describe('remainingSeconds', () => {
  it('counts down from the planned length', () => {
    expect(remainingSeconds({ ...e, planned_minutes: 25 }, new Date('2026-11-16T09:10:00Z'))).toBe(900)
  })
  it('stops at zero', () => {
    expect(remainingSeconds({ ...e, planned_minutes: 25 }, new Date('2026-11-16T10:00:00Z'))).toBe(0)
  })
})

describe('splitByHour', () => {
  it('splits an entry that crosses an hour', () => {
    expect(
      splitByHour(
        { ...e, started_at: '2026-11-16T09:40:00Z', ended_at: '2026-11-16T10:10:00Z' },
        new Date('2026-11-16T12:00:00Z')
      )
    ).toEqual([
      { day: '2026-11-16', hour: 9, seconds: 1200 },
      { day: '2026-11-16', hour: 10, seconds: 600 },
    ])
  })
  it('uses London days and hours across midnight in summer', () => {
    expect(
      splitByHour(
        { ...e, started_at: '2026-07-01T22:50:00Z', ended_at: '2026-07-01T23:10:00Z' },
        new Date('2026-07-02T12:00:00Z')
      )
    ).toEqual([
      { day: '2026-07-01', hour: 23, seconds: 600 },
      { day: '2026-07-02', hour: 0, seconds: 600 },
    ])
  })
  it('adds up to the capped elapsed time for a forgotten entry', () => {
    const parts = splitByHour(e, new Date('2026-11-17T09:00:00Z'))
    expect(parts.reduce((sum, p) => sum + p.seconds, 0)).toBe(14400)
    expect(parts.map(p => p.hour)).toEqual([9, 10, 11, 12])
  })
  it('is empty for a zero-length entry', () => {
    expect(splitByHour({ ...e, ended_at: e.started_at }, new Date('2026-11-16T12:00:00Z'))).toEqual([])
  })
})

describe('CATEGORIES', () => {
  it('has the nine Time Intelligence categories', () => {
    expect(Object.keys(CATEGORIES)).toHaveLength(9)
    expect(CATEGORIES.admin.label).toBe('Admin / Email')
  })
})

describe('formatClock', () => {
  it('shows minutes and seconds under an hour', () => {
    expect(formatClock(1505)).toBe('25:05')
  })
  it('shows hours past an hour', () => {
    expect(formatClock(3725)).toBe('1:02:05')
  })
})

describe('parseTrackBody', () => {
  it('accepts a start', () => {
    expect(parseTrackBody({ action: 'start', category: 'meetings', label: ' Standup ', energy: 4 })).toEqual({
      ok: true,
      action: 'start',
      category: 'meetings',
      label: 'Standup',
      energy: 4,
    })
  })
  it('accepts a stop', () => {
    expect(parseTrackBody({ action: 'stop' })).toEqual({ ok: true, action: 'stop' })
  })
  it('accepts a finished block', () => {
    expect(parseTrackBody({ action: 'log', category: 'admin', minutes: '30' })).toEqual({
      ok: true,
      action: 'log',
      category: 'admin',
      minutes: 30,
      label: null,
      energy: null,
    })
  })
  it('rejects an unknown action', () => {
    expect(parseTrackBody({ action: 'pause' }).ok).toBe(false)
  })
  it('rejects an unknown category', () => {
    expect(parseTrackBody({ action: 'start', category: 'napping' }).ok).toBe(false)
  })
  it('rejects minutes outside 1 to 240', () => {
    for (const minutes of [0, 241, -5, 'abc', undefined])
      expect(parseTrackBody({ action: 'log', category: 'admin', minutes }).ok).toBe(false)
  })
  it('drops an out-of-range energy rather than failing', () => {
    expect(parseTrackBody({ action: 'start', category: 'rest', energy: 9 })).toMatchObject({
      ok: true,
      energy: null,
    })
  })
  it('rejects a body that is not an object', () => {
    expect(parseTrackBody(null).ok).toBe(false)
    expect(parseTrackBody('start').ok).toBe(false)
  })
})

import { endFields, pauseFields } from './time'

describe('pauseFields', () => {
  it('starts a pause', () => {
    expect(pauseFields(e, new Date('2026-11-16T09:10:00Z'))).toEqual({
      paused_at: '2026-11-16T09:10:00.000Z',
      paused_seconds: 0,
    })
  })
  it('resumes and banks the paused time', () => {
    expect(
      pauseFields(
        { ...e, paused_at: '2026-11-16T09:10:00Z', paused_seconds: 60 },
        new Date('2026-11-16T09:15:00Z')
      )
    ).toEqual({ paused_at: null, paused_seconds: 360 })
  })
})

describe('endFields', () => {
  it('ends a running entry now', () => {
    expect(endFields(e, new Date('2026-11-16T09:25:00Z'))).toEqual({
      ended_at: '2026-11-16T09:25:00.000Z',
      paused_at: null,
      paused_seconds: 0,
    })
  })
  it('banks an open pause so elapsed time is unchanged by ending', () => {
    const paused = { ...e, paused_at: '2026-11-16T09:10:00Z' }
    const now = new Date('2026-11-16T09:25:00Z')
    const ended = { ...paused, ...endFields(paused, now) }
    expect(elapsedSeconds(ended, now)).toBe(elapsedSeconds(paused, now))
    expect(ended.paused_seconds).toBe(900)
  })
  it('ends a forgotten entry at the four-hour cap, not now', () => {
    expect(endFields(e, new Date('2026-11-17T09:00:00Z')).ended_at).toBe('2026-11-16T13:00:00.000Z')
  })
})
