import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api-auth'
import { parseCalendarPayload } from '@/lib/calendar'

/**
 * Calendar events from an iOS Shortcut. The events sent replace whatever is
 * stored for the days covered, so cancelled meetings disappear. Safe to resend.
 */
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

  const parsed = parseCalendarPayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = createAdminClient()
  const receivedAt = new Date().toISOString()

  // Write the new set first, then remove anything older in the range, so a
  // failed write never leaves the day empty.
  if (parsed.events.length > 0) {
    const { error } = await supabase
      .from('calendar_events')
      .upsert(
        parsed.events.map(e => ({ ...e, received_at: receivedAt })),
        { onConflict: 'source,source_id' }
      )
    if (error) {
      console.error('Calendar upsert error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
  }

  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('source', 'shortcut')
    .gte('day', parsed.from)
    .lte('day', parsed.to)
    .lt('received_at', receivedAt)
  if (deleteError) {
    console.error('Calendar clear error:', deleteError)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ events: parsed.events.length, from: parsed.from, to: parsed.to })
}
