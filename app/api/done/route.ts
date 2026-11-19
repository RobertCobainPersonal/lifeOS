import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api-auth'
import { londonToday } from '@/lib/dates'
import { parseDoneBody } from '@/lib/done'

/** Phone Shortcuts: add one or more things got done. A dictated list becomes one entry per line. */
export async function POST(request: Request) {
  if (!verifyBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body', message: 'Could not read that' }, { status: 400 })
  }

  const today = londonToday(new Date())
  const parsed = parseDoneBody(body, today)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, message: parsed.error }, { status: 400 })
  }

  const { error } = await createAdminClient()
    .from('done_entries')
    .insert(parsed.items.map(text => ({ day: parsed.day, text, source: 'shortcut' })))
  if (error) {
    console.error('Done insert error:', error)
    return NextResponse.json({ error: 'Failed to save', message: 'Could not save — try again' }, { status: 500 })
  }

  const n = parsed.items.length
  const when = parsed.day === today ? 'today' : parsed.day
  return NextResponse.json({ saved: n, day: parsed.day, message: `Logged ${n} thing${n === 1 ? '' : 's'} for ${when}` })
}
