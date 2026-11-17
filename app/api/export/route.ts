import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  EXPORT_ORDER,
  EXPORT_TABLES,
  buildExport,
  exportFilename,
  readAllRows,
  type ExportTable,
} from '@/lib/export'

const PAGE = 1000

/** Download everything as one JSON file. Uses the signed-in session, so only the owner gets data. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows: Partial<Record<ExportTable, unknown[]>> = {}
  try {
    for (const table of EXPORT_TABLES) {
      rows[table] = await readAllRows(async (from, to) => {
        let query = supabase.from(table).select('*', { count: 'exact' })
        for (const column of EXPORT_ORDER[table]) query = query.order(column)
        const { data, error, count } = await query.range(from, to)
        if (error) throw new Error(`${table}: ${error.message}`)
        return { rows: data ?? [], total: count }
      }, PAGE)
    }
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Could not read all of your data' }, { status: 500 })
  }

  const now = new Date()
  return new NextResponse(JSON.stringify(buildExport(rows, now), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFilename(now)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
