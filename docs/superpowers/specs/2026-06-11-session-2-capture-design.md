# Session 2 — Capture Design

**Date:** 11 June 2026
**Session goal:** Quick-add UI on Today + `/api/capture` endpoint + iOS Share Sheet Shortcut, tested end-to-end from phone.
**AI parse:** deferred to v1.5.

---

## Overview

Three independent pieces delivered together:

1. **Quick Add UI** — a text input on the Today page that captures a thought in one tap, no decisions required.
2. **`POST /api/capture`** — a bearer-token-secured API route for external capture (iOS Shortcut, future automations).
3. **iOS Shortcuts** — a Share Sheet Shortcut (Teams, Safari, most apps) and a Voice Shortcut (home screen dictation), both posting to the API.

The two-second rule applies to all three paths: text in, captured, done.

---

## 1. Quick Add UI

### Component

`components/QuickAdd.tsx` — a Client Component used inside the Today Server Component.

**Behaviour:**
- Single `<input type="text">` field, placeholder "Capture a thought…"
- Pressing Enter (or submitting the form) inserts a row into `captures` with `source: 'manual'`
- Empty input: Enter does nothing
- On success: field clears + `router.refresh()` re-runs the Today Server Component (updates inbox count)
- On error: brief inline error message ("Failed to save — try again")

**Insert path:** Supabase browser client (`createClient()` from `lib/supabase/client.ts`). The user is already authenticated via Supabase Auth session. No separate API call needed for web capture.

### Responsive layout

| Screen | Position |
|---|---|
| Mobile (`< sm`, < 640px) | `fixed bottom-0 left-0 right-0` — always visible, thumb-reachable |
| Desktop/tablet (`sm:`) | Static, at the top of the Today content area (above the task list) |

On mobile, the Today content area gets `pb-20` padding so the last item isn't hidden behind the fixed bar.

### Inbox badge

The Today Server Component fetches the count of untriaged captures (`triaged_at IS NULL`) and passes it to `QuickAdd` as a prop. QuickAdd renders it as a small badge next to the input: `"3 in inbox"`. Updates on every `router.refresh()` after a capture.

---

## 2. `POST /api/capture` endpoint

### File

`app/api/capture/route.ts`

### Request

```
POST /api/capture
Authorization: Bearer <CAPTURE_API_TOKEN>
Content-Type: application/json
```

```json
{
  "text": "string (required)",
  "source": "manual | share | voice | email (optional, default: manual)",
  "url": "string (optional)"
}
```

### Responses

| Status | Body |
|---|---|
| 201 | `{ "id": "uuid", "created_at": "ISO timestamp" }` |
| 400 | `{ "error": "text is required" }` |
| 401 | `{ "error": "Unauthorized" }` |
| 405 | `{ "error": "Method not allowed" }` |

### Auth

Compares the `Authorization` header value against `Bearer ${CAPTURE_API_TOKEN}`. Constant-time comparison to avoid timing attacks. Missing or incorrect token → 401.

### Insert

Uses `lib/supabase/admin.ts` — a Supabase client initialised with `SUPABASE_SERVICE_ROLE_KEY`. The service role bypasses RLS, which is correct: the bearer token is the auth mechanism, not Supabase Auth.

### New env vars

| Var | Where |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, `.env.local.example`, Netlify |

`CAPTURE_API_TOKEN` was already added in Session 1.

---

## 3. Supabase admin client

`lib/supabase/admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

Server-only — never imported in Client Components. Only used by API route handlers.

---

## 4. iOS Shortcuts

Both Shortcuts POST to the deployed Netlify URL. The plan doc will include exact step-by-step Shortcuts app configuration.

### Shortcut 1 — Share Sheet ("Capture to LifeOS")

**Trigger:** Share Sheet (appears in every app's share menu after setup)

**Works in:** Teams, Safari, Chrome, Slack, Notes, and most third-party apps. See Known Gaps for Mail.

**Actions:**
1. Receive input from Share Sheet (accepts Text and URLs)
2. Get text from shared item → variable `SharedText`
3. Get URL from shared item (if available, else empty) → variable `SharedURL`
4. HTTP POST to `https://<netlify-url>/api/capture`
   - Headers: `Authorization: Bearer <CAPTURE_API_TOKEN>`, `Content-Type: application/json`
   - Body: `{ "text": SharedText, "url": SharedURL, "source": "share" }`
5. Show notification: "Captured ✓"

### Shortcut 2 — Voice ("Capture to LifeOS (Voice)")

**Trigger:** Home screen icon, Action button, or Apple Watch

**Actions:**
1. Dictate text → variable `SpokenText`
2. HTTP POST to `https://<netlify-url>/api/capture`
   - Headers: `Authorization: Bearer <CAPTURE_API_TOKEN>`, `Content-Type: application/json`
   - Body: `{ "text": SpokenText, "source": "voice" }`
3. Show notification: "Captured ✓"

### Testing gate

Session 2 is not complete until:
- [ ] A capture submitted via quick-add appears in the Supabase `captures` table
- [ ] A `curl` POST to `/api/capture` returns 201 with the capture ID
- [ ] Sharing a Teams message via the Shortcut creates a row in `captures` with `source: 'share'`

---

## 5. File structure

```
app/
  api/
    capture/
      route.ts          # POST endpoint — bearer token auth, admin insert
  today/
    page.tsx            # Updated: fetches inbox count, renders QuickAdd
components/
  QuickAdd.tsx          # Client Component — text input, Supabase insert, router.refresh()
lib/
  supabase/
    admin.ts            # createAdminClient() — service role, server-only
```

---

## 6. Out of scope (Session 2)

- AI parse (deferred to v1.5)
- Inbox/triage UI (Session 3)
- Email address shown on Today page (placeholder — full Today view is Session 4)
- Inbox count beyond a badge (full list view is Session 3)

---

## 7. Known gaps / v2 items

**Mail capture loses email context.** iOS Mail has no standard Share Sheet. Current v1 workflow: highlight the action text in the email → share via Shortcut → captured as plain text. The `url` field is available for a future deep-link but iOS Mail does not provide a reliable URL scheme.

**v2 candidate:** A dedicated "Capture email" Shortcut using Mail's Shortcut actions (`Get Current Message`, `Get Details of Mail Message`) to capture subject + sender + date as structured metadata alongside the action text. The data model already supports this via `url` (could store a `message://` URI if reliable) and `raw_text`.
