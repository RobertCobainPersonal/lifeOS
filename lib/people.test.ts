import { describe, expect, it } from 'vitest'
import { CADENCES, dueList, nextDue, parsePerson, sinceLabel } from './people'

const person = (over: object = {}) => ({
  id: 'p1',
  name: 'Sam',
  cadence_days: 30,
  last_contact: '2026-10-01' as string | null,
  note: null as string | null,
  created_at: '2026-09-01T09:00:00Z',
  ...over,
})

describe('parsePerson', () => {
  it('accepts a name and a known rhythm', () => {
    expect(parsePerson({ name: '  Sam Carter ', cadence: '30' }, [])).toEqual({
      ok: true,
      name: 'Sam Carter',
      cadence_days: 30,
    })
  })
  it('rejects a blank name', () => {
    expect(parsePerson({ name: '  ', cadence: '30' }, []).ok).toBe(false)
  })
  it('rejects someone already on the list, whatever the case', () => {
    expect(parsePerson({ name: 'sam carter', cadence: '30' }, ['Sam Carter']).ok).toBe(false)
  })
  it('rejects a rhythm that is not offered', () => {
    expect(parsePerson({ name: 'Sam', cadence: '3' }, []).ok).toBe(false)
    expect(parsePerson({ name: 'Sam', cadence: 'often' }, []).ok).toBe(false)
  })
  it('offers weekly to twice a year', () => {
    expect(CADENCES.map(c => c.days)).toEqual([7, 14, 30, 90, 180])
  })
})

describe('nextDue', () => {
  it('is the last contact plus the rhythm', () => {
    expect(nextDue(person())).toBe('2026-10-31')
  })
  it('is the day they were added when there has been no contact yet', () => {
    expect(nextDue(person({ last_contact: null }))).toBe('2026-09-01')
  })
})

describe('dueList', () => {
  const today = '2026-11-17'
  const people = [
    person({ id: 'a', name: 'Recent', last_contact: '2026-11-10' }),
    person({ id: 'b', name: 'A while', last_contact: '2026-10-01' }),
    person({ id: 'c', name: 'Longest', last_contact: '2026-06-01', cadence_days: 90 }),
    person({ id: 'd', name: 'Due today', last_contact: '2026-11-10', cadence_days: 7 }),
    person({ id: 'e', name: 'Never', last_contact: null }),
  ]
  it('lists only people whose rhythm has come round, longest wait first', () => {
    expect(dueList(people, today).map(p => p.name)).toEqual(['Never', 'Longest', 'A while', 'Due today'])
  })
  it('is empty when everyone is recent', () => {
    expect(dueList([people[0]], today)).toEqual([])
  })
})

describe('sinceLabel', () => {
  const today = '2026-11-17'
  it('describes the gap plainly', () => {
    expect(sinceLabel(null, today)).toBe('Not yet')
    expect(sinceLabel('2026-11-17', today)).toBe('Today')
    expect(sinceLabel('2026-11-16', today)).toBe('Yesterday')
    expect(sinceLabel('2026-11-12', today)).toBe('5 days ago')
    expect(sinceLabel('2026-10-27', today)).toBe('3 weeks ago')
    expect(sinceLabel('2026-08-10', today)).toBe('3 months ago')
  })
  it('never uses guilt words', () => {
    for (const d of [null, '2025-01-01', '2026-06-01'])
      expect(sinceLabel(d, today)).not.toMatch(/overdue|late|neglect|missed/i)
  })
})
