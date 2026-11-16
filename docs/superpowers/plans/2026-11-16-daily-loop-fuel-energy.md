# Daily Loop, Fuel and Energy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn LifeOS Home into a calm daily loop (one thing, one timer with Focus and Track modes, close-out) and add a two-tap food log, Apple Health training data and a Record of where time goes.

**Architecture:** Server Components read from Supabase; Server Actions write; all rules that can be wrong (dates, timer maths, input parsing, weekly summary) live in pure functions under `lib/` with unit tests. Health data arrives by bearer-token POST from an iOS Shortcut, mirroring `/api/capture`.

**Tech Stack:** Next.js 16.2.9, React 19, Tailwind 4, Supabase (project `lvqojlymhvorsyagchov`), Netlify. Vitest added as a dev dependency for `lib/` tests.

**Spec:** `docs/superpowers/specs/2026-11-16-daily-loop-fuel-energy-design.md`

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code (`AGENTS.md`).
- No new runtime dependencies. Dev dependencies: `vitest` only.
- Migrations are additive; no existing column or table is dropped.
- Existing `/api/capture`, Shortcuts and ClickUp sync keep working unchanged.
- Every "today" comes from `lib/dates.ts` (Europe/London). No `toISOString().split('T')[0]` remains in `app/`, `components/` or `lib/`.
- Home must show fewer blocks than it does now. No streak-loss messaging, no red counters.
- Common log actions take two taps or fewer.
- Styling follows the existing dark Tailwind look (`bg-gray-950`, `bg-gray-900` cards, `max-w-lg`).
- Work on branch `feat/daily-loop`. Push at each checkpoint. Merging to `main` (which deploys to production) is Rob's call.
- Migrations are applied to the live project through the Supabase MCP `apply_migration` tool and also saved under `supabase/migrations/`.

## Review Focus

1. A time entry is started and never ended (phone dies, forgotten overnight). Home should show it as still running with a Stop button, and its counted time is capped at 4 hours. → Task 4.
2. Food or a session logged between midnight and 01:00 in British Summer Time. It belongs to the London day, not the UTC day. → Task 1.
3. The Health Shortcut runs twice for the same day, or re-sends a workout. No duplicate rows; latest values win. → Task 7.
4. Food entry with blank, negative, decimal-comma or non-numeric calories. Rejected with an inline message, nothing saved; blank protein is saved as 0. → Task 6.
5. The one-thing task is completed or deleted during the day. Home shows it as done and offers "pick another", never an empty card or an error. → Task 3.

---

## File structure

| File | Responsibility |
|------|----------------|
| `lib/dates.ts` | London day helpers |
| `lib/time.ts` | Categories, timer maths, hour splitting |
| `lib/fuel.ts` | Food input parsing, day totals |
| `lib/health.ts` | Health payload validation |
| `lib/record.ts` | Weekly summary, heatmap grid, hot spots, free windows |
| `lib/daylog.ts` | `getOrCreateDayLog`, one-thing resolution (server-only) |
| `app/today/*` | Home, morning plan, close-out actions |
| `app/time/*` | Timer page (both modes) and actions |
| `app/api/track/route.ts` | Shortcut start / stop / log |
| `app/fuel/*` | Food log page and actions |
| `app/more/page.tsx` | Links: Tasks, Work, Slipping, Record, Settings |
| `app/record/page.tsx` | Weekly cards |
| `app/api/health/route.ts` | Shortcut ingest |
| `lib/api-auth.ts` | `verifyBearer`, extracted from `/api/capture` |
| `docs/health-shortcut-setup.md` | Phone setup steps |

---

### Task 1: Test harness and London dates (checkpoint 1)

**Files:**
- Create: `lib/dates.ts`, `lib/dates.test.ts`, `vitest.config.ts`
- Modify: `package.json` (add `"test": "vitest run"`), and the 14 call sites: `app/tasks/actions.ts:21`, `app/tasks/page.tsx:25`, `app/today/page.tsx:20-24`, `app/clickup/page.tsx:48`, `components/Top3Item.tsx:42`, `components/TaskCard.tsx:109`, `app/slipping/actions.ts:8`, `app/today/actions.ts:8,42,53`, `app/clickup/actions.ts:24`, `lib/clickup.ts:63`, `components/ClickupTop3Item.tsx:39`

**Interfaces:**
- Produces:
  - `londonDate(d: Date): string` — `YYYY-MM-DD` in Europe/London
  - `londonToday(now?: Date): string`
  - `addDays(day: string, n: number): string`
  - `londonDayStartIso(day: string): string` — UTC ISO instant of London midnight

- [ ] **Step 1: Install vitest, add config (node environment, `@` alias to repo root) and the `test` script.**
- [ ] **Step 2: Write failing tests**

```ts
expect(londonDate(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02') // BST
expect(londonDate(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-16') // GMT
expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
expect(addDays('2026-10-25', 1)).toBe('2026-10-26') // clock-change day
expect(londonDayStartIso('2026-07-02')).toBe('2026-07-01T23:00:00.000Z')
expect(londonDayStartIso('2026-11-16')).toBe('2026-11-16T00:00:00.000Z')
```

- [ ] **Step 3: Run `npm test` — expect FAIL (module not found).**
- [ ] **Step 4: Implement with `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' })`; no library.**
- [ ] **Step 5: Replace all 14 call sites.** `lib/clickup.ts:63` becomes `londonDate(new Date(parseInt(t.due_date)))`. In `app/today/page.tsx`, `todayStart` becomes `londonDayStartIso(today)`.
- [ ] **Step 6: Verify** — `npm test` PASS; `grep -rn "toISOString().split" app lib components` returns nothing; `npm run build` succeeds.
- [ ] **Step 7: Commit** — `fix: calculate days in Europe/London`

### Task 2: Schema and types

**Files:**
- Create: `supabase/migrations/20261116000000_daily_loop.sql`
- Modify: `lib/types.ts`

**Interfaces:**
- Produces tables (all RLS `for all using ((select auth.uid()) is not null)`, matching the existing pattern):

```sql
day_log(day date primary key, one_thing_task_id uuid references tasks(id) on delete set null,
        one_thing_clickup_id text,
        kcal_target int, protein_target int, closeout jsonb, closed_at timestamptz)
time_entries(id uuid pk default gen_random_uuid(), day date not null,
        mode text not null check (mode in ('focus','track')),
        category text not null check (category in ('deep_work','meetings','admin','reactive',
          'procrastinating','personal_project','learning','rest','exercise')),
        energy smallint check (energy between 1 and 5),
        task_id uuid references tasks(id) on delete set null, clickup_id text, label text,
        planned_minutes int check (planned_minutes between 1 and 240),
        started_at timestamptz not null default now(), ended_at timestamptz,
        paused_at timestamptz, paused_seconds int not null default 0,
        distractions int not null default 0, done_note text, next_note text,
        check (mode = 'track' or planned_minutes is not null))
-- only one open entry at a time
create unique index time_one_open on time_entries ((true)) where ended_at is null;
saved_meals(id uuid pk default gen_random_uuid(), name text not null unique,
        kcal int not null, protein_g int not null default 0, use_count int not null default 0)
food_entries(id uuid pk default gen_random_uuid(), day date not null, label text not null,
        kcal int not null check (kcal between 0 and 5000), protein_g int not null default 0,
        meal_id uuid references saved_meals(id) on delete set null, created_at timestamptz default now())
activities(source text not null, source_id text not null, started_at timestamptz not null,
        day date not null, type text, distance_m int, moving_seconds int, avg_hr int, kcal int,
        primary key (source, source_id))
daily_health(day date primary key, sleep_minutes int, resting_hr int, hrv int, updated_at timestamptz default now())
alter table settings add column if not exists journal_prompts jsonb
        default '["What went well today?","What got in the way?","What matters most tomorrow?"]',
  add column if not exists default_kcal int default 2400,
  add column if not exists default_protein int default 160;
```

- Indexes: `food_entries(day)`, `time_entries(day)`, `activities(day)`.
- Produces TypeScript interfaces `DayLog`, `TimeEntry`, `SavedMeal`, `FoodEntry`, `Activity`, `DailyHealth`, and the three new fields on `Settings`, with column names as above.

- [ ] **Step 1: Write the migration file.**
- [ ] **Step 2: Apply with Supabase MCP `apply_migration` (name `daily_loop`).**
- [ ] **Step 3: Verify** — `list_tables` shows the six new tables with `rls_enabled: true`; inserting a second row into `time_entries` with `ended_at` null fails with a unique violation (run in a transaction and roll back); `get_advisors` (security) reports no new issues.
- [ ] **Step 4: Add the types; `npm run build` succeeds.**
- [ ] **Step 5: Commit** — `feat: schema for day log, time entries, fuel and health`

### Task 3: Calm Home, one thing, navigation

**Files:**
- Create: `lib/daylog.ts`, `lib/onething.ts`, `lib/onething.test.ts`, `components/OneThingCard.tsx`, `components/FuelLine.tsx`, `app/more/page.tsx`
- Modify: `app/today/page.tsx` (rewrite), `app/today/actions.ts`, `components/MorningPlan.tsx`, `components/BottomNav.tsx`, and every page that renders `BottomNav`

**Interfaces:**
- Produces:
  - `getOrCreateDayLog(day: string): Promise<DayLog>` — on create, copies `default_kcal`/`default_protein` from settings into the targets
  - `resolveOneThing(log, tasks, clickup): { state: 'none' } | { state: 'open' | 'done', kind: 'task' | 'clickup', id: string, title: string }` — pure, in `lib/onething.ts`. A referenced task with `status='done'` gives `done`; a reference that matches nothing gives `none`
  - `setOneThing(ref: { taskId: string } | { clickupId: string } | null): Promise<void>` — also pins the item to today's Top 3 if not already
  - `confirmMorningPlan(taskIds: string[], oneThingId: string | null, clickupIds: string[]): Promise<void>` — replaces the current signature; `clickupIds` are pinned with the existing `pinClickUpToTop3`
  - `BottomNav` prop `current: 'today' | 'inbox' | 'fuel' | 'more'`; items Today · Inbox · Fuel · More

- [ ] **Step 1: Write failing tests for `resolveOneThing`**: open task → `open`; completed task → `done` with its title; id not found in either list → `none`; ClickUp reference → `kind: 'clickup'`; null log fields → `none`.
- [ ] **Step 2: Run — FAIL. Implement. Run — PASS.**
- [ ] **Step 3: Rewrite Home** to this order and nothing else: header with settings link and latest-activity text (hidden until Task 7 supplies data); Now row (placeholder until Task 4); `OneThingCard`; Top 3 (excluding the one thing); `FuelLine` (hidden until Task 6 supplies totals); collapsed `AdminBatch`; Close the day button from 16:00 London (links to `/today/close`, built in Task 5); `ResetMyDay`; `QuickAdd`; `BottomNav`. Remove: Due Today section, ClickUp due-today items, nav link stack, done footer.
- [ ] **Step 4: `OneThingCard` states** — `none`: "Pick your one thing" opening a chooser of today's Top 3; `open`: title and Start focus (links to `/time?task=<id>` or `?clickup=<id>`); `done`: struck-through title and "Pick another".
- [ ] **Step 5: Morning plan** — first tapped item is the one thing (badge "1"); up to three selected in total; add a collapsed "Pull from work" row listing ClickUp items due today; due and slipping local tasks stay listed as now.
- [ ] **Step 6: More page** with links to Tasks, Work (ClickUp), Slipping (with count), Record, Settings. Pages that passed `current="tasks"` now pass `current="more"`.
- [ ] **Step 7: Verify** — `npm test`, `npm run lint`, `npm run build` pass. Run `npm run dev`, sign in, and confirm on a 390 px viewport: Home shows at most seven blocks; a ClickUp item due today does not appear until pinned; completing the one thing shows the done state.
- [ ] **Step 8: Commit and push** — `feat: calm Home with one thing and new navigation` (checkpoint 1)

### Task 4: Time entries — Focus and Track (checkpoint 2)

**Files:**
- Create: `lib/time.ts`, `lib/time.test.ts`, `app/time/page.tsx`, `app/time/actions.ts`, `components/FocusTimer.tsx`, `components/FocusEndForm.tsx`, `components/CategoryGrid.tsx`, `components/NowRow.tsx`, `components/EnergyPicker.tsx`, `app/api/track/route.ts`, `lib/api-auth.ts`
- Modify: `app/today/page.tsx` (Now row), `app/api/capture/route.ts` (use `verifyBearer`, no behaviour change)

**Interfaces:**
- Produces:
  - `CATEGORIES: Record<Category, { label: string }>` with keys and labels: `deep_work` Deep Work, `meetings` Meetings, `admin` Admin / Email, `reactive` Reactive Work, `procrastinating` Procrastinating, `personal_project` Personal Project, `learning` Learning, `rest` Rest / Recovery, `exercise` Exercise
  - `MAX_ENTRY_SECONDS = 14400`
  - `elapsedSeconds(e: Pick<TimeEntry,'started_at'|'ended_at'|'paused_at'|'paused_seconds'>, now: Date): number` — from timestamps, minus pauses, capped at `MAX_ENTRY_SECONDS`, never negative
  - `remainingSeconds(e, now): number` — focus only; floor 0
  - `splitByHour(e, now): { day: string; hour: number; seconds: number }[]` — London day and hour; an entry crossing an hour or midnight is split; total equals `elapsedSeconds`
  - `verifyBearer(request: Request): boolean` — the existing constant-time check against `CAPTURE_API_TOKEN`
  - `startFocus(input: { taskId?: string; clickupId?: string; label: string; plannedMinutes: number; energy?: number }): Promise<{ id: string } | { error: 'focus_running' }>`
  - `startTrack(input: { category: Category; label?: string; energy?: number }): Promise<{ id: string } | { error: 'focus_running' }>`
  - Both end a running Track entry first; both return `focus_running` if a Focus entry is open
  - `stopEntry(id: string)`, `togglePause(id: string)`, `logDistraction(id: string)`, `endFocus(id: string, doneNote: string, nextNote: string, completeTask: boolean)` — `nextNote` is saved as a capture (`source: 'manual'`) when non-empty and the task was not completed
  - `POST /api/track` body, one of: `{ "action": "start", "category": "meetings", "label"?: string, "energy"?: 1-5 }`, `{ "action": "stop" }`, `{ "action": "log", "category": "admin", "minutes": 30, "label"?: string, "energy"?: 1-5 }` (a finished block ending now). Responses: 401 bad token; 400 unknown action, unknown category, or minutes outside 1 to 240; 409 `{ error: 'focus_running' }`; 200 with the entry. `stop` with nothing running returns 200 `{ stopped: false }`.

- [ ] **Step 1: Write failing tests**

```ts
const e = { started_at: '2026-11-16T09:00:00Z', ended_at: null, paused_at: null, paused_seconds: 0 }
expect(elapsedSeconds(e, new Date('2026-11-16T09:25:00Z'))).toBe(1500)
expect(elapsedSeconds({ ...e, paused_seconds: 300 }, new Date('2026-11-16T09:25:00Z'))).toBe(1200)
expect(elapsedSeconds({ ...e, paused_at: '2026-11-16T09:10:00Z' }, new Date('2026-11-16T09:25:00Z'))).toBe(600)
expect(elapsedSeconds(e, new Date('2026-11-17T09:00:00Z'))).toBe(14400) // forgotten overnight
expect(elapsedSeconds({ ...e, ended_at: '2026-11-16T09:50:00Z' }, new Date('2026-11-16T12:00:00Z'))).toBe(3000)
expect(elapsedSeconds(e, new Date('2026-11-16T08:59:00Z'))).toBe(0) // clock skew
expect(splitByHour({ ...e, started_at: '2026-11-16T09:40:00Z', ended_at: '2026-11-16T10:10:00Z' }, new Date()))
  .toEqual([{ day: '2026-11-16', hour: 9, seconds: 1200 }, { day: '2026-11-16', hour: 10, seconds: 600 }])
// BST: 22:50Z on 1 July is 23:50 London; crosses London midnight
expect(splitByHour({ ...e, started_at: '2026-07-01T22:50:00Z', ended_at: '2026-07-01T23:10:00Z' }, new Date()))
  .toEqual([{ day: '2026-07-01', hour: 23, seconds: 600 }, { day: '2026-07-02', hour: 0, seconds: 600 }])
expect(Object.keys(CATEGORIES)).toHaveLength(9)
```

- [ ] **Step 2: Run — FAIL. Implement. Run — PASS.**
- [ ] **Step 3: Actions.** Map the unique-index violation to `focus_running` instead of throwing. Focus entries are written with `category: 'deep_work'`.
- [ ] **Step 4: `/time` page.** Nothing running: `CategoryGrid` (nine large buttons) with optional label and `EnergyPicker`; when opened with `?task=` or `?clickup=`, show Focus lengths 25 / 50 / 90 / custom (1 to 240) instead. Focus running: `FocusTimer` renders from `started_at`, re-computing each second and on `visibilitychange`; buttons Distracted (+1), Break (pause/resume), End, which opens `FocusEndForm` ("What got done?", "What's next?", "Mark task done" tick when there is a local task). Track running: category, elapsed, Stop, and the grid for switching.
- [ ] **Step 5: `NowRow` on Home** above the one thing: running entry with elapsed and Stop (Focus links to `/time`), or a single "Track time" link when idle.
- [ ] **Step 6: `/api/track` route**, using `createAdminClient()` as `/api/capture` does.
- [ ] **Step 7: Verify** — tests, lint, build pass. In dev: start a 25-minute focus, reload and lock/unlock the tab, elapsed continues from the true start; start Track on Meetings then tap Admin, one ended Meetings row and one open Admin row exist; `curl` start, stop and log against `/api/track` return 200 and without the token 401; `/api/capture` still returns 201.
- [ ] **Step 8: Commit** — `feat: time entries with focus and track modes`

### Task 5: Close the day

**Files:**
- Create: `app/today/close/page.tsx`, `components/CloseoutForm.tsx`
- Modify: `app/today/actions.ts`, `app/settings/page.tsx`, `app/settings/actions.ts`, `components/SettingsForm.tsx`

**Interfaces:**
- Consumes: `getOrCreateDayLog`, `elapsedSeconds`, `setOneThing`
- Produces:
  - `saveCloseout(answers: string[], tomorrowTaskId: string | null): Promise<void>` — writes `closeout = { prompts: string[], answers: string[] }` and `closed_at`; if `tomorrowTaskId` is set, writes tomorrow's `day_log.one_thing_task_id`
  - `updateJournalPrompts(prompts: string[]): Promise<void>` — one to three non-empty prompts, each 120 characters or fewer
  - `updateTargets(kcal: number, protein: number): Promise<void>` — kcal 1000 to 5000, protein 0 to 400; updates settings defaults and today's `day_log`

- [ ] **Step 1: Close page** shows today's minutes by category (only categories with time), focus minutes, Top 3 done of pinned, food against target (line omitted until Task 6), then the prompts from settings as text areas, then an optional "Tomorrow's one thing" chooser from open tasks. All fields optional; Save is always enabled.
- [ ] **Step 2: Settings** gains Journal prompts (three inputs) and Daily targets (kcal, protein).
- [ ] **Step 3: Home** shows "Day closed ✓" in place of the button once `closed_at` is set. A day with no close-out shows nothing the next morning.
- [ ] **Step 4: Verify** — tests, lint, build pass. In dev: save with all fields blank succeeds; reopening shows saved answers; tomorrow's one thing appears pre-selected in the next morning plan (test by setting `last_planned_date` to null and the device date forward, or by inspecting `day_log`).
- [ ] **Step 5: Commit and push** — `feat: close the day with journal prompts` (checkpoint 2)

### Task 6: Fuel (checkpoint 3)

**Files:**
- Create: `lib/fuel.ts`, `lib/fuel.test.ts`, `app/fuel/page.tsx`, `app/fuel/actions.ts`, `components/FoodEntryForm.tsx`, `components/SavedMealList.tsx`
- Modify: `app/today/page.tsx` (feed `FuelLine`), `app/today/close/page.tsx`

**Interfaces:**
- Produces:
  - `parseFoodInput(raw: { label: string; kcal: string; protein: string }): { ok: true; label: string; kcal: number; protein_g: number } | { ok: false; error: string }`
  - `dayTotals(entries: Pick<FoodEntry,'kcal'|'protein_g'>[]): { kcal: number; protein_g: number }`
  - `addFood(input: { label: string; kcal: string; protein: string; saveAsMeal: boolean }): Promise<{ error?: string }>`
  - `logSavedMeal(mealId: string): Promise<void>` — inserts an entry for today and increments `use_count`
  - `deleteFood(entryId: string): Promise<void>`, `deleteSavedMeal(mealId: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

```ts
expect(parseFoodInput({ label: ' Chicken wrap ', kcal: '520', protein: '38' }))
  .toEqual({ ok: true, label: 'Chicken wrap', kcal: 520, protein_g: 38 })
expect(parseFoodInput({ label: 'Toast', kcal: '180', protein: '' })).toMatchObject({ ok: true, protein_g: 0 })
expect(parseFoodInput({ label: 'x', kcal: '520.6', protein: '' })).toMatchObject({ ok: true, kcal: 521 })
for (const kcal of ['', 'abc', '-50', '5,20', '9000'])
  expect(parseFoodInput({ label: 'x', kcal, protein: '' }).ok).toBe(false)
expect(parseFoodInput({ label: '  ', kcal: '100', protein: '' }).ok).toBe(false)
expect(dayTotals([{ kcal: 500, protein_g: 30 }, { kcal: 250, protein_g: 12 }])).toEqual({ kcal: 750, protein_g: 42 })
expect(dayTotals([])).toEqual({ kcal: 0, protein_g: 0 })
```

- [ ] **Step 2: Run — FAIL. Implement. Run — PASS.**
- [ ] **Step 3: Fuel page**: totals against target at the top; saved meals as large tap targets ordered by `use_count` desc (one tap logs); entry form (label, kcal, protein, "Save as meal" tick) with `inputMode="numeric"`; today's entries with delete. Saving a meal whose name exists updates that meal's figures.
- [ ] **Step 4: Home `FuelLine`** shows `kcal / target · protein / target` and a `+` linking to `/fuel`. Neutral colour at all values, including over target.
- [ ] **Step 5: Verify** — tests, lint, build pass. In dev: log a meal with "Save as meal", then re-log it in one tap from `/fuel` (two taps from Home); invalid calories show the inline error and save nothing.
- [ ] **Step 6: Commit and push** — `feat: fuel log with saved meals` (checkpoint 3)

### Task 7: Apple Health ingest (checkpoint 4)

**Files:**
- Create: `lib/health.ts`, `lib/health.test.ts`, `app/api/health/route.ts`, `docs/health-shortcut-setup.md`
- Modify: `app/today/page.tsx` (activity line), `.env.local.example` (no new variable; note that `/api/health` reuses `CAPTURE_API_TOKEN`)

**Interfaces:**
- Consumes: `verifyBearer` (Task 4)
- Produces:
  - Request body:

```json
{ "day": "2026-11-15", "sleep_minutes": 412, "resting_hr": 52, "hrv": 61,
  "workouts": [{ "id": "optional", "type": "Running", "start": "2026-11-15T07:02:00Z",
                 "duration_seconds": 3120, "distance_m": 8040, "kcal": 640, "avg_hr": 148 }] }
```

  - `parseHealthPayload(body: unknown): { ok: true; health: DailyHealth | null; activities: Activity[] } | { ok: false; error: string }` — `day` required (`YYYY-MM-DD`); every other field optional; numbers accepted as numbers or numeric strings and rounded; `source` is `'apple_health'`; `source_id` is `id` when present, otherwise `` `${start}|${type}` ``; each activity's `day` is `londonDate(start)`; `health` is null when no health field is present
  - `POST /api/health` → 401 bad token, 400 with `error` on invalid body, 200 `{ activities: n, health: boolean }`. Upserts on `(source, source_id)` and on `day`.

- [ ] **Step 1: Write failing tests**: full payload parses; numeric strings (`"412"`) are accepted; missing `day` or `day: '15/11/2026'` → `ok: false`; workout without `start` is dropped, others kept; two workouts with the same `start` and `type` and no `id` yield the same `source_id`; workout at `2026-07-01T23:30:00Z` gets `day` `2026-07-02`; payload with only `day` gives `health: null` and no activities.
- [ ] **Step 2: Run — FAIL. Implement. Run — PASS.**
- [ ] **Step 3: Route**, using `createAdminClient()` and `verifyBearer`.
- [ ] **Step 4: Home activity line** in the header: most recent activity within three days as "Ran 8.0 km yesterday" / "Strength 45 min today"; nothing when there is none.
- [ ] **Step 5: Write `docs/health-shortcut-setup.md`**: a daily personal automation (suggested 07:00) that finds yesterday's workouts, sleep, resting heart rate and HRV with Find Health Samples, builds the JSON above and POSTs it with the existing bearer token. State plainly which steps were not tested on a device. `[TO COMPLETE: Rob to build and test the Shortcut on his phone; adjust field mapping to what Shortcuts actually returns.]`
- [ ] **Step 6: Verify** — tests, lint, build pass. With `npm run dev`: `curl` the example payload twice with the token → 200 both times and one row per workout and per day in the database; without the token → 401; `/api/capture` still returns 201.
- [ ] **Step 7: Commit** — `feat: Apple Health ingest via Shortcut`

### Task 8: Record

**Files:**
- Create: `lib/record.ts`, `lib/record.test.ts`, `app/record/page.tsx`, `components/Heatmap.tsx`

**Interfaces:**
- Consumes: `elapsedSeconds`, `splitByHour`, `CATEGORIES`, `dayTotals`, `addDays`
- Produces:
  - `MIN_DAYS = 14`, `WORK_HOURS = { start: 8, end: 18 }`
  - `weekSummary(input: { days: string[]; entries: TimeEntry[]; food: FoodEntry[]; logs: DayLog[]; now: Date }): { focusMinutes: number; minutesByCategory: Partial<Record<Category, number>>; distractions: number; foodDaysLogged: number; daysClosed: number; avgEnergy: number | null }`
  - `hourGrid(entries: TimeEntry[], now: Date): { hour: number; minutes: Partial<Record<Category, number>> }[]` — always 24 rows, London hours
  - `hotSpots(grid): number[]` — up to three hours with the most Procrastinating minutes, most first; empty when there are none
  - `freeWindows(entries, days: string[], now): { hour: number; freeShare: number }[]` — hours 06 to 22 outside `WORK_HOURS`, with the share of tracked days on which that hour had no entry or only Rest; returns `[]` when fewer than `MIN_DAYS` days have any entry; sorted by `freeShare` desc, top five
  - `trainingSplit(input: { entries; activities; days; now }): { afterTraining: number; afterRest: number } | null` — mean focus minutes on days following a day with any activity versus days following none; null when fewer than `MIN_DAYS` days have a focus entry or either group is empty
  - `sentences(current, previous): string[]` — plain sentences; a comparison clause appears only when `previous` has at least one entry

- [ ] **Step 1: Write failing tests**: two focus entries of 1500 s and 3000 s give `focusMinutes: 75`; a 30-minute Meetings track entry appears under `minutesByCategory.meetings` and not in `focusMinutes`; `avgEnergy` is null with no ratings; an unfinished entry counts its capped elapsed time; `hourGrid([])` has 24 rows of empty minutes; `hotSpots` on a grid with procrastinating minutes at 14:00 (40), 15:00 (10), 11:00 (25) returns `[14, 11, 15]`; `freeWindows` returns `[]` on 13 tracked days and excludes hours 8 to 17 on 14; `trainingSplit` returns null on 13 days and figures on 14; `sentences` omits the comparison when the previous week is empty and never contains "streak", "missed" or "failed".
- [ ] **Step 2: Run — FAIL. Implement. Run — PASS.**
- [ ] **Step 3: Page**: this week's sentences; `Heatmap` (hours down, categories across, cell shade by minutes, last 14 days, plain CSS grid) once any entry exists; hot spots and free windows as one sentence each when non-empty; the training card only when `trainingSplit` is non-null. With no data: one line, "More here once there are a few days of entries."
- [ ] **Step 4: Verify** — tests, lint, build pass; page renders with an empty database and with one entry.
- [ ] **Step 5: Commit and push** — `feat: record with heatmap and windows` (checkpoint 4)

### Task 9: Final check and handoff

- [ ] **Step 1:** `npm test`, `npm run lint`, `npm run build` all pass on a clean install.
- [ ] **Step 2:** Walk the full loop in dev on a 390 px viewport: morning plan → one thing → focus → end → track and switch → fuel → close → record. Note anything that takes more than two taps for a common log.
- [ ] **Step 3:** Supabase `get_advisors` (security and performance) shows nothing new.
- [ ] **Step 4:** Write `session-5-handoff.md` in the style of `session-4-handoff.md`: what was built, how to test, deviations from the spec, and the open `[TO COMPLETE]` items (journal prompts, calorie band rule, Health Shortcut build, Rob's own `/api/track` Shortcuts).
- [ ] **Step 5:** Open a pull request from `feat/daily-loop` to `main`. Do not merge.
