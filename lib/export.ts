import { londonDate } from '@/lib/dates'

/** Every table holding the owner's data, parents before children. */
export const EXPORT_TABLES = [
  'settings',
  'captures',
  'projects',
  'tasks',
  'clickup_tasks',
  'day_log',
  'time_entries',
  'saved_meals',
  'food_entries',
  'habits',
  'habit_ticks',
  'activities',
  'daily_health',
  'calendar_events',
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
