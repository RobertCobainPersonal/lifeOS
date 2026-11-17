import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api-auth'
import { parseTrackBody } from '@/lib/time'
import { getOpenEntry, logBlock, startEntry, stopOpenEntry } from '@/lib/time-store'

/** Phone Shortcuts: start a category, stop, or log a finished block. */
export async function POST(request: Request) {
  if (!verifyBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = parseTrackBody(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  try {
    if (parsed.action === 'stop') {
      const stopped = await stopOpenEntry(supabase, now)
      return NextResponse.json(stopped ? { stopped: true, entry: stopped } : { stopped: false })
    }

    if (parsed.action === 'log') {
      // A block logged while something is running would count that time twice
      const open = await getOpenEntry(supabase)
      if (open) {
        return NextResponse.json(
          { error: open.mode === 'focus' ? 'focus_running' : 'tracking_running' },
          { status: 409 }
        )
      }
      const entry = await logBlock(supabase, parsed, now)
      return NextResponse.json({ entry })
    }

    const result = await startEntry(
      supabase,
      { mode: 'track', category: parsed.category, label: parsed.label, energy: parsed.energy },
      now
    )
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json({ entry: result.entry })
  } catch (err) {
    console.error('Track error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
