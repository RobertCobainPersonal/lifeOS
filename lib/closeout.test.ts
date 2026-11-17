import { describe, expect, it } from 'vitest'
import { checkTargets, cleanPrompts, summariseEntries, tomorrowChange } from './closeout'

describe('cleanPrompts', () => {
  it('trims and drops blank prompts', () => {
    expect(cleanPrompts([' What went well? ', '', '  ', 'What next?'])).toEqual({
      ok: true,
      prompts: ['What went well?', 'What next?'],
    })
  })
  it('needs at least one prompt', () => {
    expect(cleanPrompts(['', ' ']).ok).toBe(false)
  })
  it('allows at most three', () => {
    expect(cleanPrompts(['a', 'b', 'c', 'd']).ok).toBe(false)
  })
  it('rejects a prompt over 120 characters', () => {
    expect(cleanPrompts(['x'.repeat(121)]).ok).toBe(false)
    expect(cleanPrompts(['x'.repeat(120)]).ok).toBe(true)
  })
})

describe('checkTargets', () => {
  it('accepts sensible targets', () => {
    expect(checkTargets(2400, 160)).toEqual({ ok: true, kcal: 2400, protein: 160 })
  })
  it('rounds decimals', () => {
    expect(checkTargets(2399.6, 159.5)).toEqual({ ok: true, kcal: 2400, protein: 160 })
  })
  it('rejects calories outside 1000 to 5000', () => {
    expect(checkTargets(999, 160).ok).toBe(false)
    expect(checkTargets(5001, 160).ok).toBe(false)
    expect(checkTargets(NaN, 160).ok).toBe(false)
  })
  it('rejects protein outside 0 to 400', () => {
    expect(checkTargets(2400, -1).ok).toBe(false)
    expect(checkTargets(2400, 401).ok).toBe(false)
  })
})

describe('summariseEntries', () => {
  const base = { ended_at: null, paused_at: null, paused_seconds: 0, distractions: 0 }
  const now = new Date('2026-11-16T18:00:00Z')
  it('totals focus minutes and minutes by category', () => {
    const entries = [
      { ...base, mode: 'focus' as const, category: 'deep_work' as const, started_at: '2026-11-16T09:00:00Z', ended_at: '2026-11-16T09:25:00Z', distractions: 2 },
      { ...base, mode: 'focus' as const, category: 'deep_work' as const, started_at: '2026-11-16T10:00:00Z', ended_at: '2026-11-16T10:50:00Z', distractions: 1 },
      { ...base, mode: 'track' as const, category: 'meetings' as const, started_at: '2026-11-16T11:00:00Z', ended_at: '2026-11-16T11:30:00Z' },
    ]
    expect(summariseEntries(entries, now)).toEqual({
      focusMinutes: 75,
      focusSessions: 2,
      distractions: 3,
      minutesByCategory: { deep_work: 75, meetings: 30 },
    })
  })
  it('counts a running entry up to now', () => {
    const entries = [
      { ...base, mode: 'track' as const, category: 'admin' as const, started_at: '2026-11-16T17:40:00Z' },
    ]
    expect(summariseEntries(entries, now).minutesByCategory).toEqual({ admin: 20 })
  })
  it('groups by the key it is given', () => {
    const entries = [
      { ...base, mode: 'track' as const, category: null, activity_id: 'h-play', started_at: '2026-11-16T09:00:00Z', ended_at: '2026-11-16T10:00:00Z' },
      { ...base, mode: 'track' as const, category: null, activity_id: 'h-soc', started_at: '2026-11-16T10:00:00Z', ended_at: '2026-11-16T10:30:00Z' },
    ]
    const toGroup = () => 'hockey'
    expect(summariseEntries(entries, now, toGroup).minutesByCategory).toEqual({ hockey: 90 })
  })
  it('is empty with no entries', () => {
    expect(summariseEntries([], now)).toEqual({
      focusMinutes: 0,
      focusSessions: 0,
      distractions: 0,
      minutesByCategory: {},
    })
  })
})

describe('tomorrowChange', () => {
  it('sets a new pick', () => {
    expect(tomorrowChange('t1', null)).toEqual({ write: true, taskId: 't1' })
  })
  it('clears an earlier pick when set back to deciding in the morning', () => {
    expect(tomorrowChange(null, 't1')).toEqual({ write: true, taskId: null })
  })
  it('does nothing when there was no pick and still is none', () => {
    expect(tomorrowChange(null, null)).toEqual({ write: false, taskId: null })
  })
  it('does nothing when the pick is unchanged', () => {
    expect(tomorrowChange('t1', 't1')).toEqual({ write: false, taskId: 't1' })
  })
})
