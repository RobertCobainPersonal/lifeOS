import { describe, expect, it } from 'vitest'
import { describeActivity, parseHealthPayload } from './health'

const full = {
  day: '2026-11-15',
  sleep_minutes: 412,
  resting_hr: 52,
  hrv: 61,
  workouts: [
    {
      id: 'ABC-1',
      type: 'Running',
      start: '2026-11-15T07:02:00Z',
      duration_seconds: 3120,
      distance_m: 8040,
      kcal: 640,
      avg_hr: 148,
    },
  ],
}

describe('parseHealthPayload', () => {
  it('parses a full payload', () => {
    expect(parseHealthPayload(full)).toEqual({
      ok: true,
      health: { day: '2026-11-15', sleep_minutes: 412, resting_hr: 52, hrv: 61 },
      activities: [
        {
          source: 'apple_health',
          source_id: 'ABC-1',
          started_at: '2026-11-15T07:02:00.000Z',
          day: '2026-11-15',
          type: 'Running',
          distance_m: 8040,
          moving_seconds: 3120,
          avg_hr: 148,
          kcal: 640,
        },
      ],
    })
  })
  it('accepts numbers sent as text and rounds them', () => {
    const result = parseHealthPayload({ day: '2026-11-15', sleep_minutes: '412.4', hrv: '61' })
    expect(result).toMatchObject({
      ok: true,
      health: { sleep_minutes: 412, resting_hr: null, hrv: 61 },
    })
  })
  it('requires a day', () => {
    expect(parseHealthPayload({ sleep_minutes: 400 }).ok).toBe(false)
  })
  it('rejects a day that is not YYYY-MM-DD', () => {
    expect(parseHealthPayload({ day: '15/11/2026' }).ok).toBe(false)
    expect(parseHealthPayload({ day: '2026-13-40' }).ok).toBe(false)
  })
  it('drops a workout with no usable start and keeps the rest', () => {
    const result = parseHealthPayload({
      day: '2026-11-15',
      workouts: [{ type: 'Yoga' }, { type: 'Walking', start: 'not a date' }, full.workouts[0]],
    })
    expect(result.ok && result.activities.map(a => a.source_id)).toEqual(['ABC-1'])
  })
  it('gives the same id to a re-sent workout that has no id', () => {
    const w = { type: 'Running', start: '2026-11-15T07:02:00Z' }
    const a = parseHealthPayload({ day: '2026-11-15', workouts: [w] })
    const b = parseHealthPayload({ day: '2026-11-15', workouts: [w] })
    expect(a.ok && a.activities[0].source_id).toBe('2026-11-15T07:02:00.000Z|Running')
    expect(a.ok && b.ok && a.activities[0].source_id === b.activities[0].source_id).toBe(true)
  })
  it('collapses duplicate workouts within one payload', () => {
    const w = { type: 'Running', start: '2026-11-15T07:02:00Z' }
    const result = parseHealthPayload({ day: '2026-11-15', workouts: [w, w] })
    expect(result.ok && result.activities).toHaveLength(1)
  })
  it('files a late summer workout under the London day', () => {
    const result = parseHealthPayload({
      day: '2026-07-01',
      workouts: [{ type: 'Running', start: '2026-07-01T23:30:00Z' }],
    })
    expect(result.ok && result.activities[0].day).toBe('2026-07-02')
  })
  it('has no health row when only the day is sent', () => {
    expect(parseHealthPayload({ day: '2026-11-15' })).toEqual({ ok: true, health: null, activities: [] })
  })
  it('ignores impossible values rather than storing them', () => {
    const result = parseHealthPayload({ day: '2026-11-15', sleep_minutes: -5, resting_hr: 'n/a', hrv: 61 })
    expect(result).toMatchObject({ ok: true, health: { sleep_minutes: null, resting_hr: null, hrv: 61 } })
  })
  it('accepts a single workout object as well as a list', () => {
    const result = parseHealthPayload({ day: '2026-11-15', workouts: full.workouts[0] })
    expect(result.ok && result.activities).toHaveLength(1)
  })
  it('rejects a body that is not an object', () => {
    expect(parseHealthPayload('hello').ok).toBe(false)
    expect(parseHealthPayload(null).ok).toBe(false)
  })
})

describe('describeActivity', () => {
  const run = { type: 'Running', day: '2026-11-15', distance_m: 8040, moving_seconds: 3120 }
  it('describes a run from yesterday with its distance', () => {
    expect(describeActivity(run, '2026-11-16')).toBe('Running 8.0 km yesterday')
  })
  it('uses minutes when there is no distance', () => {
    expect(
      describeActivity({ type: 'Strength', day: '2026-11-16', distance_m: null, moving_seconds: 2700 }, '2026-11-16')
    ).toBe('Strength 45 min today')
  })
  it('names older days by how long ago', () => {
    expect(describeActivity(run, '2026-11-18')).toBe('Running 8.0 km 3 days ago')
  })
  it('falls back to a plain word with no type or figures', () => {
    expect(
      describeActivity({ type: null, day: '2026-11-16', distance_m: null, moving_seconds: null }, '2026-11-16')
    ).toBe('Workout today')
  })
})
