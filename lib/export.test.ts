import { describe, expect, it } from 'vitest'
import { EXPORT_ORDER, EXPORT_TABLES, buildExport, exportFilename, readAllRows } from './export'

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
        'food_entries', 'habit_ticks', 'habits', 'people', 'projects', 'saved_meals', 'settings', 'tasks', 'time_entries',
      ].sort()
    )
  })
})

describe('exportFilename', () => {
  it('is dated in London time', () => {
    expect(exportFilename(new Date('2026-07-01T23:30:00Z'))).toBe('20260702_lifeos_export.json')
  })
})

describe('readAllRows', () => {
  const source = (total: number, serverMax: number) => {
    const all = Array.from({ length: total }, (_, i) => ({ id: i }))
    const calls: [number, number][] = []
    const fetchPage = async (from: number, to: number) => {
      calls.push([from, to])
      return { rows: all.slice(from, Math.min(to + 1, from + serverMax)), total }
    }
    return { fetchPage, calls }
  }
  it('reads every row across pages', async () => {
    const { fetchPage } = source(2500, 1000)
    const rows = await readAllRows(fetchPage, 1000)
    expect(rows).toHaveLength(2500)
    expect(new Set(rows.map(r => (r as { id: number }).id)).size).toBe(2500)
  })
  it('keeps going when the server returns fewer rows than asked for', async () => {
    const { fetchPage } = source(2500, 400)
    expect(await readAllRows(fetchPage, 1000)).toHaveLength(2500)
  })
  it('reads an empty table in one request', async () => {
    const { fetchPage, calls } = source(0, 1000)
    expect(await readAllRows(fetchPage, 1000)).toEqual([])
    expect(calls).toHaveLength(1)
  })
  it('stops if the server runs dry before the stated total', async () => {
    const fetchPage = async (from: number) => ({ rows: from === 0 ? [{ id: 1 }] : [], total: 50 })
    expect(await readAllRows(fetchPage, 1000)).toEqual([{ id: 1 }])
  })
})

describe('EXPORT_ORDER', () => {
  it('gives every table a stable order to page by', () => {
    for (const t of EXPORT_TABLES) expect(EXPORT_ORDER[t].length).toBeGreaterThan(0)
  })
})
