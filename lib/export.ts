import { londonDate } from '@/lib/dates'

/** Every table holding the owner's data, parents before children. */
export const EXPORT_TABLES = [
  'settings',
  'captures',
  'projects',
  'tasks',
  'clickup_tasks',
  'day_log',
  'done_entries',
  'time_activities',
  'time_entries',
  'saved_meals',
  'food_entries',
  'habits',
  'habit_ticks',
  'activities',
  'daily_health',
  'calendar_events',
  'people',
] as const

export type ExportTable = (typeof EXPORT_TABLES)[number]

export interface LifeosExport {
  format: 'lifeos-export'
  version: 1
  exported_at: string
  counts: Record<ExportTable, number>
  tables: Record<ExportTable, unknown[]>
}

export function buildExport(rows: Partial<Record<ExportTable, unknown[]>>, now: Date): LifeosExport {
  const tables = {} as Record<ExportTable, unknown[]>
  const counts = {} as Record<ExportTable, number>
  for (const t of EXPORT_TABLES) {
    tables[t] = rows[t] ?? []
    counts[t] = tables[t].length
  }
  return { format: 'lifeos-export', version: 1, exported_at: now.toISOString(), counts, tables }
}

/** e.g. 20261117_lifeos_export.json */
export function exportFilename(now: Date): string {
  return `${londonDate(now).replaceAll('-', '')}_lifeos_export.json`
}

/** Columns that give each table a stable order, so paging never repeats or skips a row. */
export const EXPORT_ORDER: Record<ExportTable, string[]> = {
  settings: ['id'],
  captures: ['id'],
  projects: ['id'],
  tasks: ['id'],
  clickup_tasks: ['clickup_id'],
  day_log: ['day'],
  done_entries: ['id'],
  time_activities: ['id'],
  time_entries: ['id'],
  saved_meals: ['id'],
  food_entries: ['id'],
  habits: ['id'],
  habit_ticks: ['habit_id', 'day'],
  activities: ['source', 'source_id'],
  daily_health: ['day'],
  calendar_events: ['source', 'source_id'],
  people: ['id'],
}

/**
 * Read a whole table through a paged source. Advances by the rows actually
 * returned, so a server that caps pages below the requested size still works.
 */
export async function readAllRows(
  fetchPage: (from: number, to: number) => Promise<{ rows: unknown[]; total: number | null }>,
  pageSize: number
): Promise<unknown[]> {
  const rows: unknown[] = []
  for (;;) {
    const page = await fetchPage(rows.length, rows.length + pageSize - 1)
    rows.push(...page.rows)
    if (page.rows.length === 0) break
    if (page.total !== null && rows.length >= page.total) break
  }
  return rows
}
