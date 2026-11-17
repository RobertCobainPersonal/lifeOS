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

describe('habitWeek for a new item', () => {
  const days = ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']
  it('counts only the days since it was added', () => {
    const added = [{ id: 'h3', name: 'Water', created_at: '2026-11-16T08:00:00Z' }]
    expect(habitWeek(added, [{ habit_id: 'h3', day: '2026-11-16' }], days)).toEqual([
      { id: 'h3', name: 'Water', kept: 1, of: 2 },
    ])
  })
})

describe('habitWeek', () => {
  const habits = [
    { id: 'h1', name: 'Stretch', created_at: '2026-11-01T09:00:00Z' },
    { id: 'h2', name: 'Read', created_at: '2026-11-01T09:00:00Z' },
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
