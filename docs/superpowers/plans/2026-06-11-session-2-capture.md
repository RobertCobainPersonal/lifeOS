# Session 2 — Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full capture loop — quick-add UI on Today, a bearer-token API endpoint, and tested iOS Shortcuts — so real items can be captured from day two.

**Architecture:** Web capture uses a Supabase browser-client insert directly (user is authenticated via session). External capture (iOS Shortcuts) uses a `POST /api/capture` route that validates a bearer token and inserts via the Supabase service role key, bypassing RLS. The Today page (Server Component) fetches the inbox count and passes it to a `QuickAdd` Client Component; `router.refresh()` updates the count after each capture.

**Tech Stack:** Next.js 16 App Router, Supabase JS v2, `@supabase/ssr`, Node.js `crypto.timingSafeEqual`

---

## File Map

```
lib/
  supabase/
    admin.ts            ← NEW: createAdminClient() using SUPABASE_SERVICE_ROLE_KEY (server-only)
app/
  api/
    capture/
      route.ts          ← NEW: POST /api/capture — bearer token auth, admin insert
  today/
    page.tsx            ← MODIFY: fetch inbox count, render QuickAdd
components/
  QuickAdd.tsx          ← NEW: Client Component — text input, Supabase insert, router.refresh()
.env.local              ← MODIFY: add SUPABASE_SERVICE_ROLE_KEY
.env.local.example      ← MODIFY: add SUPABASE_SERVICE_ROLE_KEY placeholder
```

---

## Task 1: Supabase admin client + env vars

**Files:**
- Modify: `.env.local`
- Modify: `.env.local.example`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Get the service role key**

In Supabase dashboard → project `lvqojlymhvorsyagchov` → Settings → API → copy the `service_role` key (labelled "secret"). Keep this private — it bypasses all RLS.

- [ ] **Step 2: Add to `.env.local`**

Append to `/Users/robertcobain/Developer/personal/lifeOS/.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<paste the service_role key here>
```

- [ ] **Step 3: Add placeholder to `.env.local.example`**

Append to `/Users/robertcobain/Developer/personal/lifeOS/.env.local.example`:

```
SUPABASE_SERVICE_ROLE_KEY=get-from-supabase-dashboard-settings-api
```

- [ ] **Step 4: Create `lib/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

This file is server-only — never import it in Client Components. The service role key must never be sent to the browser.

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/admin.ts .env.local.example
git commit -m "chore: add Supabase admin client and service role env var"
```

Note: do NOT commit `.env.local`.

---

## Task 2: `POST /api/capture` endpoint

**Files:**
- Create: `app/api/capture/route.ts`

- [ ] **Step 1: Create the route handler**

Create `app/api/capture/route.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

function verifyToken(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = process.env.CAPTURE_API_TOKEN ?? ''

  if (!token || !expected || !verifyToken(token, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { text?: string; source?: string; url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
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
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. Route tree should now include `POST /api/capture`.

- [ ] **Step 3: Test the endpoint locally**

```bash
npm run dev &
sleep 3

# Read token from env
TOKEN=$(grep CAPTURE_API_TOKEN .env.local | cut -d= -f2)

# Test 1: valid request
curl -s -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text": "test capture from curl", "source": "manual"}'
```

Expected: `{"id":"<uuid>","created_at":"<timestamp>"}`

```bash
# Test 2: wrong token → 401
curl -s -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrongtoken" \
  -d '{"text": "should fail"}'
```

Expected: `{"error":"Unauthorized"}`

```bash
# Test 3: missing text → 400
curl -s -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source": "manual"}'
```

Expected: `{"error":"text is required"}`

```bash
kill %1 2>/dev/null
```

- [ ] **Step 4: Verify row in Supabase**

In Supabase dashboard → Table Editor → `captures` table. Confirm a row with `raw_text: "test capture from curl"` and `source: "manual"` is present.

- [ ] **Step 5: Commit**

```bash
git add app/api/capture/route.ts
git commit -m "feat: add POST /api/capture endpoint with bearer token auth"
```

---

## Task 3: `QuickAdd` component

**Files:**
- Create: `components/QuickAdd.tsx`

- [ ] **Step 1: Create the component**

Create `components/QuickAdd.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface QuickAddProps {
  inboxCount: number
}

export default function QuickAdd({ inboxCount }: QuickAddProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!value.trim()) return

    setError('')
    const supabase = createClient()
    const { error: insertError } = await supabase.from('captures').insert({
      raw_text: value.trim(),
      source: 'manual',
    })

    if (insertError) {
      setError('Failed to save — try again')
      return
    }

    setValue('')
    router.refresh()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:static sm:mb-6 bg-gray-900 border-t border-gray-800 sm:border sm:rounded-xl px-4 py-3 sm:px-4 sm:py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Capture a thought…"
          autoComplete="off"
          className="flex-1 bg-transparent text-white placeholder-gray-500 text-base focus:outline-none"
        />
        {inboxCount > 0 && (
          <span className="text-xs text-gray-500 shrink-0 tabular-nums">
            {inboxCount} in inbox
          </span>
        )}
      </form>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
```

**How the responsive layout works:**
- Mobile (`< 640px`): `fixed bottom-0 left-0 right-0 z-50` — the bar is always visible at the bottom of the screen regardless of scroll position.
- Desktop (`sm:` = 640px+): `sm:static` overrides `fixed`, `sm:mb-6` adds spacing below it. The component renders in normal document flow at the top of the Today content.

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add components/QuickAdd.tsx
git commit -m "feat: add QuickAdd capture component"
```

---

## Task 4: Wire QuickAdd into Today page

**Files:**
- Modify: `app/today/page.tsx`

- [ ] **Step 1: Update Today page**

Replace the full contents of `app/today/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuickAdd from '@/components/QuickAdd'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { count } = await supabase
    .from('captures')
    .select('*', { count: 'exact', head: true })
    .is('triaged_at', null)

  const inboxCount = count ?? 0

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <QuickAdd inboxCount={inboxCount} />
      <div className="px-6 pt-6 pb-28 sm:pb-6">
        <h1 className="text-2xl font-bold mb-1">Today</h1>
        <p className="text-gray-500 text-sm mb-8">Session 2 complete ✓</p>
        {inboxCount > 0 && (
          <p className="text-gray-400 text-sm">{inboxCount} item{inboxCount !== 1 ? 's' : ''} waiting in inbox</p>
        )}
      </div>
    </div>
  )
}
```

**What changed from the Session 1 placeholder:**
- Imports and renders `<QuickAdd inboxCount={inboxCount} />`
- Fetches inbox count with `.select('*', { count: 'exact', head: true }).is('triaged_at', null)` — this is Supabase's way to count rows without fetching all data
- Content div gets `pb-28` (mobile) / `sm:pb-6` (desktop) padding so content doesn't hide behind the fixed QuickAdd bar

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Manual test in browser**

```bash
npm run dev
```

Open `http://localhost:3000/today` (you'll need to be logged in — if not, go through `/auth` first).

Check:
1. The QuickAdd bar is visible at the bottom of the screen (on a narrow window) or at the top of the content (on a wide window)
2. Type a thought and press Enter → field clears
3. "1 in inbox" badge appears next to the input
4. In Supabase dashboard → `captures` table → the new row is there with `source: 'manual'` and `triaged_at: null`
5. Type a second item → badge shows "2 in inbox"
6. Resize the browser to > 640px wide → QuickAdd moves to top of content

- [ ] **Step 4: Commit**

```bash
git add app/today/page.tsx
git commit -m "feat: wire QuickAdd into Today page with live inbox count"
```

---

## Task 5: Deploy + iOS Shortcuts

**Files:** None (deploy + on-device Shortcut configuration)

- [ ] **Step 1: Add `SUPABASE_SERVICE_ROLE_KEY` to Netlify**

In Netlify dashboard → your LifeOS site → Site configuration → Environment variables → Add variable:
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- Value: the same value as in your local `.env.local`

- [ ] **Step 2: Deploy to production**

```bash
git push
```

Watch the Netlify deploy log. Expected: build succeeds, deploy published.

- [ ] **Step 3: Smoke test the live API**

```bash
TOKEN=$(grep CAPTURE_API_TOKEN .env.local | cut -d= -f2)

curl -s -X POST https://<your-netlify-url>.netlify.app/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text": "live API test", "source": "manual"}'
```

Expected: `{"id":"<uuid>","created_at":"<timestamp>"}`. Verify the row appears in Supabase.

- [ ] **Step 4: Build the Share Sheet Shortcut on your iPhone**

Open the **Shortcuts** app → tap **+** (top right) → tap the title field → rename to **"Capture to LifeOS"**.

Add actions in this order:

**Action 1 — Receive input:**
- Search for "Receive input from Share Sheet"
- Tap it to add
- Under "Content Types to Accept": enable **Text** and **URLs** (disable Images, etc.)
- Set "If there's no input": **Continue**

**Action 2 — Text:**
- Search for "Text"
- Tap it to add
- In the text field, tap the variable icon and select **Shortcut Input** (this passes whatever was shared)

**Action 3 — Get Contents of URL:**
- Search for "Get Contents of URL"
- Tap it to add
- URL field: `https://<your-netlify-url>.netlify.app/api/capture`
- Tap "Show More"
- Method: **POST**
- Headers: tap **+** to add:
  - Header 1 — Key: `Authorization`, Value: `Bearer <paste your CAPTURE_API_TOKEN here>`
  - Header 2 — Key: `Content-Type`, Value: `application/json`
- Request Body: **JSON**
- Body fields: tap **+** twice to add:
  - Field 1 — Key: `text`, Value: tap the variable icon → select the **Text** variable from Action 2
  - Field 2 — Key: `source`, Value: `share` (type this literally)

**Action 4 — Notification:**
- Search for "Show Notification"
- Title: `Captured ✓`
- Body: tap the variable icon → select **Shortcut Input** (shows what was shared)

**Add to Share Sheet:**
- Tap the **ⓘ** icon (bottom of screen) → enable **Show in Share Sheet**

- [ ] **Step 5: Test the Share Sheet Shortcut**

1. Open **Teams** on your phone → find a message with an action item
2. Long-press the message → **Share**
3. Scroll to find "Capture to LifeOS" in the share sheet → tap it
4. You should see the "Captured ✓" notification
5. In Supabase dashboard → `captures` table → confirm a new row with `source: 'share'` and the Teams message text

- [ ] **Step 6: Build the Voice Shortcut on your iPhone**

Open the **Shortcuts** app → tap **+** → rename to **"Capture to LifeOS (Voice)"**.

**Action 1 — Dictate Text:**
- Search for "Dictate Text"
- Language: Default

**Action 2 — Get Contents of URL:**
- Same URL as above: `https://<your-netlify-url>.netlify.app/api/capture`
- Method: **POST**
- Headers: same two headers as the Share Sheet Shortcut
- Request Body: **JSON**
  - Field 1 — Key: `text`, Value: tap the variable icon → select **Dictated Text** from Action 1
  - Field 2 — Key: `source`, Value: `voice`

**Action 3 — Show Notification:**
- Title: `Captured ✓`
- Body: the **Dictated Text** variable

**Add to Home Screen:**
- Tap the **ⓘ** icon → **Add to Home Screen** → place it somewhere reachable with one thumb

- [ ] **Step 7: Test the Voice Shortcut**

1. Tap the shortcut on your home screen
2. Speak: "Follow up with Jane about the Q3 budget"
3. Confirm the "Captured ✓" notification appears
4. In Supabase → `captures` → confirm a row with `source: 'voice'` and your spoken text

- [ ] **Step 8: Session 2 complete — final verification**

All three capture paths working:

```
✓ Web quick-add: typed item → appears in Supabase with source: 'manual'
✓ API endpoint: curl POST → 201 with capture ID
✓ Share Sheet: Teams message shared → appears with source: 'share'
✓ Voice: spoken thought → appears with source: 'voice'
✓ Inbox count badge updates after each web capture
```

- [ ] **Step 9: Tag the release**

```bash
git tag session-2
git push --tags
```

---

## Self-review against spec

**Spec coverage:**
- ✅ Quick Add in-app: `QuickAdd.tsx`, `components/QuickAdd.tsx`
- ✅ `POST /api/capture` secured with personal API token: `app/api/capture/route.ts`
- ✅ Share sheet capture (Teams/Safari): Shortcut Step 4
- ✅ Voice/dictation capture: Shortcut Step 6
- ✅ Captured item stores: raw_text, source, url, timestamp: all in the `captures` insert
- ✅ AI parse deferred to v1.5: not in this plan
- ✅ Inbox count badge: `QuickAdd` renders `inboxCount` prop from Today server component
- ✅ Responsive: fixed bottom on mobile, static top on desktop
- ✅ `timingSafeEqual` used for token comparison: `verifyToken()` in route.ts

**Deferred (correct):**
- Inbox/triage UI → Session 3
- Full Today view → Session 4
- Apple Watch Shortcut → can be added by duplicating the Voice Shortcut and enabling Apple Watch support (takes 2 min, user can do this independently)
