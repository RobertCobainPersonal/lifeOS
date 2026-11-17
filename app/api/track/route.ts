import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api-auth'
import { findActivity, labelOf, shortcutOptions } from '@/lib/activities'
import { parseTrackBody } from '@/lib/time'
import { getActivities, getOpenEntry, logBlock, startEntry, stopOpenEntry } from '@/lib/time-store'

/** Phone Shortcuts: the menu of activities, for a "Choose from List". */
export async function GET(request: Request) {
  if (!verifyBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const idx = await getActivities(createAdminClient())
    return NextResponse.json({ options: shortcutOptions(idx) })
  } catch (err) {
    console.error('Track list error:', err)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

/** Phone Shortcuts: start an activity, stop, pick from the menu, or log a finished block. */
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
      return NextResponse.json(
        stopped
          ? { stopped: true, entry: stopped, message: 'Stopped' }
          : { stopped: false, message: 'Nothing was running' }
      )
    }

    const idx = await getActivities(supabase)
    const activity = findActivity(parsed.activity, idx)
    if (!activity) {
      return NextResponse.json(
        { error: 'unknown_activity', message: 'That activity is not in the list', options: shortcutOptions(idx).slice(1) },
        { status: 400 }
      )
    }

    if (parsed.action === 'log') {
      // A block logged while something is running would count that time twice
      const open = await getOpenEntry(supabase)
      if (open) {
        return NextResponse.json(
          {
            error: open.mode === 'focus' ? 'focus_running' : 'tracking_running',
            message: 'Something is running — stop it first',
          },
          { status: 409 }
        )
      }
      const entry = await logBlock(supabase, { ...parsed, activity }, now)
      return NextResponse.json({ entry, message: `Logged ${parsed.minutes} min of ${labelOf(activity.id, idx)}` })
    }

    const result = await startEntry(
      supabase,
      { mode: 'track', activity, label: parsed.label, energy: parsed.energy },
      now
    )
    if ('error' in result) {
      const message =
        result.error === 'focus_running' ? 'A focus session is running — end it in LifeOS' : 'Try again'
      return NextResponse.json({ error: result.error, message }, { status: 409 })
    }
    return NextResponse.json({ entry: result.entry, message: `Tracking ${labelOf(activity.id, idx)}` })
  } catch (err) {
    console.error('Track error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
