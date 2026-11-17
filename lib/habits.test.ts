import { describe, expect, it } from 'vitest'
import { MAX_HABITS, habitWeek, parseHabitName } from './habits'

describe('parseHabitName', () => {
  it('trims the name', () => {
    expect(parseHabitName('  Stretch ', [])).toEqual({ ok: true, name: 'Stretch' })
  })
  it('rejects a blank name', () => {
    expect(parseHabitName('   ', []).ok).toBe(false)
  })
  it('rejects a name already in the list, whatever its case', () => {
    expect(parseHabitName('stretch', ['Stretch']).ok).toBe(false)
  })
  it('keeps the list short', () => {
    const full = Array.from({ length: MAX_HABITS }, (_, i) => `Habit ${i}`)
    expect(parseHabitName('One more', full)).toEqual({ ok: false, error: `Keep it to ${MAX_HABITS}` })
  })
})

describe('habitWeek', () => {
  const habits = [
    { id: 'h1', name: 'Stretch' },
    { id: 'h2', name: 'Read' },
  ]
  const days = ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']
  it('counts the days each one was kept in the period', () => {
    const ticks = [
      { habit_id: 'h1', day: '2026-11-15' },
      { habit_id: 'h1', day: '2026-11-17' },
      { habit_id: 'h2', day: '2026-11-17' },
      { habit_id: 'h1', day: '2026-11-01' },
    ]
    expect(habitWeek(habits, ticks, days)).toEqual([
      { id: 'h1', name: 'Stretch', kept: 2, of: 7 },
      { id: 'h2', name: 'Read', kept: 1, of: 7 },
    ])
  })
  it('is zero, not missing, for one never ticked', () => {
    expect(habitWeek(habits, [], days)[1]).toEqual({ id: 'h2', name: 'Read', kept: 0, of: 7 })
  })
})
