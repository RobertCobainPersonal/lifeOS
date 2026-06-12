# Session 3 Handoff — Inbox & Triage

## What was built

### Database
No new migration was needed — the `tasks` table was already fully defined in `supabase/migrations/20260610000000_initial.sql` from Session 1. The existing schema covers all Session 3 requirements.

### New files
| File | Purpose |
|------|---------|
| `app/inbox/page.tsx` | Server Component — lists untriaged captures, newest first |
| `app/inbox/actions.ts` | Server Actions — `triageCapture`, `createTaskFromCapture` |
| `app/tasks/page.tsx` | Server Component — open tasks grouped by domain |
| `app/tasks/actions.ts` | Server Action — `completeTask` |
| `components/CaptureCard.tsx` | Client Component — triage card with inline Task form |
| `components/TaskCard.tsx` | Client Component — task row with one-tap complete |
| `components/BottomNav.tsx` | Fixed bottom nav for Inbox and Tasks pages |

### Modified files
| File | Change |
|------|--------|
| `app/today/page.tsx` | Replaced placeholder text with Inbox (badge) and Tasks link cards |

---

## Manual steps required

### 1. Apply the migration to Supabase (if not already done)
The `tasks` table schema lives in `supabase/migrations/20260610000000_initial.sql`. If your Supabase project already has this table (from Session 1), skip this step.

To verify, open Supabase > Table Editor and check for a `tasks` table with columns: `id`, `capture_id`, `title`, `domain`, `energy`, `status`, `due_date`, `completed_at`, `last_touched_at`.

If the table is missing, run the migration via the Supabase dashboard (SQL Editor) or CLI:
```bash
supabase db push
```

### 2. Wait for Netlify deploy
The push just triggered a deploy to `rc-lifeos.netlify.app`. Check Netlify dashboard for build status — usually 1–2 minutes.

---

## How to test

### Inbox triage
1. Open the app and add a few captures via the quick-add bar on Today.
2. Navigate to **Inbox** (tap the Inbox link on Today, or use BottomNav once you're inside the app).
3. You should see your captures listed newest-first, each with triage buttons.
4. Test each triage action:
   - **Task** — opens inline form with title prefilled. Select domain (Work/Personal) and energy (Deep/Admin). Due date is optional. Tap Save Task. Card disappears; go to Tasks to see it.
   - **Someday** — card disappears immediately (optimistic).
   - **Done** — card disappears immediately.
   - **Delete** — card disappears immediately.
5. Check the Inbox count badge on Today updates after triage.

### Empty captures
Add a capture with no text (if the quick-add allows it, or via the API with `"text": ""`). In Inbox, the card should show `(empty capture)` in italic gray, and the **Task** button should be hidden. Someday/Done/Delete still work.

### Tasks list
1. Triage a few captures as tasks with different domains.
2. Open **Tasks** from Today or BottomNav.
3. Tasks should be grouped under Work, Personal, or Other headers (headers only appear if that group has tasks).
4. Overdue tasks (due date < today) show in red with "overdue · " prefix.
5. Tap the circle button on a task — it disappears immediately (optimistic complete).

### Navigation
- On Today: Inbox link shows blue count badge when items exist; shows "Clear" when empty.
- BottomNav appears on Inbox and Tasks pages (not Today — Today has QuickAdd at the bottom instead).
- Badge in BottomNav mirrors the live inbox count.

---

## Spec deviations and decisions

| Area | Decision | Reason |
|------|----------|--------|
| BottomNav placement | Only on Inbox and Tasks, not Today | Today has `QuickAdd` fixed to the bottom (`z-50`). Adding a second fixed nav on Today would stack or conflict. Today uses inline Link cards instead. |
| Inbox count on Inbox page | Derived from `captures.length` after fetching rows (not a separate count query) | We already fetch all rows to render them; a separate `count: exact` query would be redundant. |
| TaskForm location | Module-level function inside `CaptureCard.tsx`, not a separate file | The form only exists to serve the capture card; a separate file adds indirection with no benefit at this scale. |
| Empty capture "Task" button | Hidden for empty/whitespace captures | A task with no title is meaningless. Someday/Done/Delete still available for cleanup. |
| `triage_result` for delete | Stored as `'deleted'` | Spec says the action is "→ Delete". Using `deleted` as the enum value keeps it consistent with `someday`, `done`, and `task`. |

---

## Architecture notes for Session 4+

- **Server Actions** (`'use server'`) handle all mutations — no client-side Supabase calls needed.
- All mutations call `revalidatePath` on the relevant pages so the Server Component re-fetches without a manual refresh.
- `createTaskFromCapture` inserts to `tasks` first, then updates `captures.triaged_at` — if the task insert fails, the capture stays untriaged (safe rollback).
- `CaptureCard` uses a single `useTransition` for all triage paths; the form has its own separate `useTransition`.
- `TaskCard` uses `new Date().toISOString().split('T')[0]` for today's date — this runs client-side at render time, so it reflects the user's local time.
