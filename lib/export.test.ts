import { describe, expect, it } from 'vitest'
import { EXPORT_TABLES, buildExport, exportFilename } from './export'

describe('buildExport', () => {
  const now = new Date('2026-11-17T06:40:00Z')
  it('wraps every table with a version, timestamp and row counts', () => {
    const out = buildExport({ tasks: [{ id: 1 }, { id: 2 }], captures: [] }, now)
    expect(out.format).toBe('lifeos-export')
    expect(out.version).toBe(1)
    expect(out.exported_at).toBe('2026-11-17T06:40:00.000Z')
    expect(out.counts.tasks).toBe(2)
    expect(out.counts.captures).toBe(0)
    expect(out.tables.tasks).toEqual([{ id: 1 }, { id: 2 }])
  })
  it('includes an empty list for a table that returned nothing', () => {
    const out = buildExport({}, now)
    for (const t of EXPORT_TABLES) {
      expect(out.tables[t]).toEqual([])
      expect(out.counts[t]).toBe(0)
    }
  })
})

describe('EXPORT_TABLES', () => {
  it('covers everything a person puts into LifeOS', () => {
    expect([...EXPORT_TABLES].sort()).toEqual(
      [
        'activities', 'calendar_events', 'captures', 'clickup_tasks', 'daily_health', 'day_log',
        'food_entries', 'habit_ticks', 'habits', 'projects', 'saved_meals', 'settings', 'tasks', 'time_entries',
      ].sort()
    )
  })
})

describe('exportFilename', () => {
  it('is dated in London time', () => {
    expect(exportFilename(new Date('2026-07-01T23:30:00Z'))).toBe('20260702_lifeos_export.json')
  })
})
