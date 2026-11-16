import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/api-auth'

export async function POST(request: Request) {
  if (!verifyBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { text?: string; source?: string; url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const validSources = ['manual', 'share', 'voice', 'email']
  const source = validSources.includes(body.source ?? '') ? body.source : 'manual'

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('captures')
    .insert({
      raw_text: body.text.trim(),
      source,
      url: body.url ?? null,
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('Capture insert error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
