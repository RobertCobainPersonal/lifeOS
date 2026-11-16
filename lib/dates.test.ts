import { describe, expect, it } from 'vitest'
import { addDays, londonDate, londonDayStartIso, londonHour, londonToday } from './dates'

describe('londonDate', () => {
  it('rolls into the next day late evening UTC during BST', () => {
    expect(londonDate(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02')
  })
  it('stays on the same day late evening UTC during GMT', () => {
    expect(londonDate(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-16')
  })
})

describe('londonToday', () => {
  it('uses the supplied instant', () => {
    expect(londonToday(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02')
  })
})

describe('londonHour', () => {
  it('gives the London wall-clock hour', () => {
    expect(londonHour(new Date('2026-07-01T23:30:00Z'))).toBe(0)
    expect(londonHour(new Date('2026-11-16T16:05:00Z'))).toBe(16)
  })
})

describe('addDays', () => {
  it('crosses a month boundary backwards', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('is unaffected by the clock change', () => {
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('londonDayStartIso', () => {
  it('is 23:00 UTC the day before during BST', () => {
    expect(londonDayStartIso('2026-07-02')).toBe('2026-07-01T23:00:00.000Z')
  })
  it('is midnight UTC during GMT', () => {
    expect(londonDayStartIso('2026-11-16')).toBe('2026-11-16T00:00:00.000Z')
  })
})
