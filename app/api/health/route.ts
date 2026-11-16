import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api-auth'
import { parseHealthPayload, withoutNulls } from '@/lib/health'

/** Daily Apple Health data from an iOS Shortcut. Safe to send twice. */
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

  const parsed = parseHealthPayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (parsed.activities.length > 0) {
    // One row at a time: rows carry different columns once missing figures are dropped
    for (const activity of parsed.activities) {
      const { error } = await supabase
        .from('activities')
        .upsert(withoutNulls(activity), { onConflict: 'source,source_id' })
      if (error) {
        console.error('Health activities error:', error)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
    }
  }

  if (parsed.health) {
    const { error } = await supabase
      .from('daily_health')
      .upsert(
        { ...withoutNulls(parsed.health), updated_at: new Date().toISOString() },
        { onConflict: 'day' }
      )
    if (error) {
      console.error('Health daily error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
  }

  return NextResponse.json({ activities: parsed.activities.length, health: parsed.health !== null })
}
