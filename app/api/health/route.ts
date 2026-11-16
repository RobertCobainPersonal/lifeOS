import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api-auth'
import { parseHealthPayload } from '@/lib/health'

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
    const { error } = await supabase
      .from('activities')
      .upsert(parsed.activities, { onConflict: 'source,source_id' })
    if (error) {
      console.error('Health activities error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
  }

  if (parsed.health) {
    const { error } = await supabase
      .from('daily_health')
      .upsert({ ...parsed.health, updated_at: new Date().toISOString() }, { onConflict: 'day' })
    if (error) {
      console.error('Health daily error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
  }

  return NextResponse.json({ activities: parsed.activities.length, health: parsed.health !== null })
}
