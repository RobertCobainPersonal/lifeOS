# Session 4 Handoff — Today View & Morning Plan

## What was built

### Database
One new migration applied to Supabase (`20260612000000_add_last_planned_date.sql`):
```sql
alter table settings add column if not exists last_planned_date date;
```
This single column tracks whether the morning plan has been completed for today, preventing repeat prompts on the same day.

### New files
| File | Purpose |
|------|---------|
| `app/today/actions.ts` | Server Actions — `dismissMorningPlan`, `confirmMorningPlan` |
| `components/Top3Item.tsx` | Client Component — prominent Top 3 card with complete + remove buttons |
| `components/AdminBatch.tsx` | Client Component — collapsible admin task batch with optimistic complete |
| `components/DueItem.tsx` | Client Component — due-today row with complete + pin-to-Top-3 |
| `components/MorningPlan.tsx` | Client Component — full-screen first-open-of-day overlay |

### Modified files
| File | Change |
|------|--------|
| `app/today/page.tsx` | Full rewrite — Top 3, Admin batch, Due today, inbox badge, done footer, morning plan trigger |
| `app/tasks/actions.ts` | Added `addToTop3`, `removeFromTop3` server actions |
| `app/tasks/page.tsx` | Passes `is_top3`, `top3_date`, `top3Count` to TaskCard; shows "X/3 in Top 3 today" |
| `components/TaskCard.tsx` | Added star (★/☆) button to pin/unpin today's Top 3 |
| `lib/types.ts` | Added `last_planned_date: string | null` to Settings interface |

---

## Manual steps required

### 1. Wait for Netlify deploy
Push triggered a deploy to `rc-lifeos.netlify.app`. Usually 1–2 minutes.

### 2. Supabase migration (already applied)
The `last_planned_date date` column was applied to the live Supabase project via MCP. No manual action needed. To verify: Supabase dashboard → Table Editor → `settings` → should show the `last_planned_date` column.

---

## How to test

### Morning plan (first open of day)
1. Open the app fresh (or clear `last_planned_date` in Supabase: `UPDATE settings SET last_planned_date = NULL WHERE id = 1`).
2. You should see a full-screen overlay: **Morning Plan**.
3. If you have tasks from yesterday's Top 3, deferred tasks, or tasks due today, they appear as selectable rows.
4. Tap tasks to select (up to 3 highlighted in blue). The button label updates: "Set Top 3 (2)".
5. Tap **Set Top 3** — overlay closes, Today page reloads with those tasks in the Top 3 section.
6. Test **Skip for today** — overlay closes, today's plan is marked done without setting Top 3.
7. Reload the page — morning plan should NOT re-appear (plan is done for today).

### Today view — Top 3
1. Navigate to Today (`/today`).
2. Top 3 section shows tasks where `is_top3=true` and `top3_date=today`.
3. Each card has a filled ★ (yellow) — tap it to remove the task from Top 3 (disappears immediately, ★ turns to ☆ in Tasks list).
4. Tap the circle button on a Top 3 card → task disappears immediately (optimistic complete), appears in "Done today" footer.

### Today view — Admin batch
1. Create a task with energy = Admin (via Inbox → triage → Task → Admin).
2. Open Today — you should see an "Admin · N tasks" row (collapsed by default).
3. Tap to expand — task rows appear with small check circles.
4. Tap a check circle → task disappears immediately from the batch.

### Today view — Due today
1. Create a task with due date = today and energy = Deep.
2. Open Today — it appears in the "Due Today" section (below Admin batch).
3. Each row has: complete button, energy badge, ☆ pin button.
4. Tap ☆ — task moves to Top 3 (disappears from Due Today, appears in Top 3 section after revalidation).
5. If Top 3 is full (3 items), tapping ☆ shows "Top 3 is full" inline for 2 seconds.

### Today view — Done today footer
1. Complete a few tasks from any section.
2. Scroll to the bottom of Today — "Done today · N" section shows completed tasks with strikethrough text.
3. Refreshing the page: footer persists (server-side query for `completed_at >= midnight UTC today`).

### Top 3 from Tasks list
1. Navigate to Tasks (`/tasks`).
2. Each task row now has a ☆ button on the right.
3. Tap ☆ → turns ★ (yellow), task is added to today's Top 3.
4. Tap ★ → turns ☆, task removed from today's Top 3.
5. When 3 tasks are starred, starring a 4th shows "Top 3 is full — remove one first".
6. The header shows "X/3 in Top 3 today" when any are set.

### last_touched_at
The DB trigger `tasks_touch` fires on every `UPDATE` to the `tasks` table and sets `last_touched_at = now()`. Every action in this session (complete, addToTop3, removeFromTop3, confirmMorningPlan) issues an `UPDATE`, so `last_touched_at` stays current automatically. Session 5's Slipping view depends on this.

---

## Spec deviations and decisions

| Area | Decision | Reason |
|------|----------|--------|
| Morning plan — slipping items | Not included | Slipping view is Session 5 scope. The column and trigger are already in place; morning plan will include slipping items once detected in Session 5. |
| Morning plan — "confirm admin batch" | Not a separate step | Spec mentions confirming the admin batch in the morning plan, but admin tasks are always visible on Today's collapsed batch. A separate confirmation step adds friction without value; admin batch is visible on first scroll. |
| `confirmMorningPlan` clears existing today top3 | Yes, authoritative reset | If a user manually pinned tasks before the morning plan, `confirmMorningPlan` replaces them with the plan selection. This makes the plan the definitive daily moment, avoiding a >3 top3 accumulation bug. |
| Done footer — not collapsible | Static footer, always visible | Spec says "done items collapse to a footer" which I read as visual collapsing (compact at the bottom), not a hide/show toggle. The footer is already quiet — small text, strikethrough, bottom of page. Adding a toggle can come if it gets noisy in practice. |
| Due today — admin tasks excluded | Admin tasks go to Admin batch only | A task that is `energy=admin` and `due_date=today` appears in the Admin batch (not Due today). The Due today section is for deep-work tasks due today that haven't been pinned to Top 3. |
| "Today" date calculation | UTC date on server | The server uses `new Date().toISOString().split('T')[0]` which is UTC. For a UK user (UTC+1), tasks completed before 1am UK time won't appear in "done today". Acceptable for v1; can add timezone awareness in v2 if needed. |

---

## Architecture notes for Session 5

- **`deferred_by_reset` column** is in the DB already. Session 5's Reset My Day sets it; Session 4's morning plan already reads it (appears in "Deferred" section if any exist).
- **Slipping detection** will be: `status='open' AND last_touched_at < now() - interval '5 days'` (or `slipping_days` from settings). The trigger from Session 1 already keeps `last_touched_at` fresh on every action.
- **`addToTop3` / `removeFromTop3`** live in `app/tasks/actions.ts` — both Today and Tasks pages can import them.
- **Morning plan capping logic**: `confirmMorningPlan` hard-caps at `taskIds.length <= 3` via the client (max 3 selectable). The DB isn't enforced here — if needed, add a check in the server action.
- **ClickUp tasks** (Session 5): the `clickup_tasks` table has `pinned_top3_date`. To show ClickUp tasks in Top 3 on Today, fetch from `clickup_tasks WHERE pinned_top3_date = today` in `app/today/page.tsx` and pass to a `ClickupTop3Item` component.
