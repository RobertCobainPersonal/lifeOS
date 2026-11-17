import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { EXPORT_TABLES, buildExport, exportFilename, type ExportTable } from '@/lib/export'

const PAGE = 1000

/** Download everything as one JSON file. Uses the signed-in session, so only the owner gets data. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows: Partial<Record<ExportTable, unknown[]>> = {}
  for (const table of EXPORT_TABLES) {
    const all: unknown[] = []
    // Supabase returns at most 1,000 rows per request
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
      if (error) {
        console.error('Export error:', table, error)
        return NextResponse.json({ error: `Could not read ${table}` }, { status: 500 })
      }
      all.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }
    rows[table] = all
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
