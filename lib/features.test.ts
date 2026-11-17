import { describe, expect, it } from 'vitest'
import { FEATURES, isOn, reviewDue, withFeature } from './features'

describe('isOn', () => {
  it('is off for everything by default', () => {
    for (const f of FEATURES) expect(isOn({}, f.key)).toBe(false)
    expect(isOn(null, 'detailed_nutrition')).toBe(false)
    expect(isOn('nonsense', 'detailed_nutrition')).toBe(false)
  })
  it('is on only when stored as exactly true', () => {
    expect(isOn({ detailed_nutrition: true }, 'detailed_nutrition')).toBe(true)
    expect(isOn({ detailed_nutrition: 'yes' }, 'detailed_nutrition')).toBe(false)
    expect(isOn({ detailed_nutrition: true }, 'weekly_review')).toBe(false)
  })
})

describe('withFeature', () => {
  it('switches one feature and keeps the others', () => {
    expect(withFeature({ weekly_review: true }, 'detailed_nutrition', true)).toEqual({
      weekly_review: true,
      detailed_nutrition: true,
    })
    expect(withFeature({ weekly_review: true, detailed_nutrition: true }, 'weekly_review', false)).toEqual({
      weekly_review: false,
      detailed_nutrition: true,
    })
  })
  it('starts from nothing when the stored value is unusable', () => {
    expect(withFeature(null, 'week_ahead', true)).toEqual({ week_ahead: true })
  })
  it('refuses a feature that does not exist', () => {
    expect(() => withFeature({}, 'mind_reading' as never, true)).toThrow()
  })
})

describe('FEATURES', () => {
  it('lists the six optional features', () => {
    expect(FEATURES.map(f => f.key)).toEqual([
      'detailed_nutrition',
      'weekly_review',
      'non_negotiables',
      'sleep_line',
      'week_ahead',
      'people',
    ])
  })
})

describe('reviewDue', () => {
  it('is due when there has never been one', () => {
    expect(reviewDue(null, '2026-11-17')).toBe(true)
  })
  it('is not due within the same week', () => {
    expect(reviewDue('2026-11-15', '2026-11-17')).toBe(false)
    expect(reviewDue('2026-11-11', '2026-11-17')).toBe(false)
  })
  it('is due seven days on', () => {
    expect(reviewDue('2026-11-10', '2026-11-17')).toBe(true)
  })
})
