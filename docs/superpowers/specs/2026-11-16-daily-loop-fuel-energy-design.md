# LifeOS — Daily Loop, Fuel and Energy Design

**Date:** 16 November 2026
**Status:** APPROVED by Rob 16 Nov 2026 — to be refined in use
**Scope:** One build, four deployable checkpoints: calm Home, time entries (focus and track) and close-out, food log, training data and the Record.

---

## 1. Intent

LifeOS exists but isn't being opened. Rob's words: it "feels off", with the ClickUp link and things all over the place adding to overwhelm at a stressful time. The aim is to make LifeOS the one place he opens each day, by giving it a short daily loop (pick, focus, close) and two things he wants at his desk: quick food logging and a view of training against energy.

Inspiration is the GuyGottaChange Deep Work System. This borrows its loop (capture, plan, focus, close), not its design, wording or section list.

## 2. Goals, non-goals, anti-goals

**Goals**
- Home answers "what now?" in one screen with less on it than today.
- One timer with two modes, folding in Time Intelligence: Focus (countdown on a task) and Track (open-ended, by category). Both survive a locked phone.
- A view of where time goes: heatmap by hour, procrastination hot spots, free windows.
- A two-minute close-out that also carries journal prompts.
- Food logged in two taps for a repeat meal, against the day's calorie and protein target.
- Training data pulled in automatically, with an energy rating on each time entry, so energy and focus can be compared after a few weeks.

**Non-goals**
- Quarterly/monthly goal hierarchy, year and month views.
- Workout logging (stays in Bevel and the fitness-coach workflow).
- Food database, barcode scanning, carbs/fat tracking.
- Trading and investing sections.
- A native iOS app, widgets or lock screen controls. Phone quick-capture is by Shortcuts calling the API.
- In-app Claude analysis of time data (later, if wanted).
- Writing anything back to ClickUp or Strava.

**Anti-goals** (failure even if it works)
- Home shows more than it does now.
- Anything that punishes a missed day: no broken-streak messaging, no red counters.
- Any feature that needs daily upkeep to stay accurate. Tracking is optional; gaps are never flagged.
- Energy "predictions" presented before there is data behind them.

## 3. Current state (from the repo and database, 16 Nov 2026)

- Next.js 16.2.9, React 19, Tailwind 4, Supabase, Netlify. Single user. Last commit 12 June 2026.
- `AGENTS.md` warns that this Next.js version has breaking changes; the builder must read `node_modules/next/dist/docs/` before writing code.
- Routes: `/today`, `/inbox`, `/tasks`, `/tasks/[id]`, `/clickup`, `/slipping`, `/settings`, `/api/capture`.
- Tables: `captures` (29 rows), `tasks` (19), `clickup_tasks` (205, read-only mirror), `settings` (1).
- `/today` already has: morning plan overlay, Top 3 (local and ClickUp), admin batch, due today (local and ClickUp), links to Inbox/Tasks/Work/Slipping, Reset My Day, done footer.
- Known defect: "today" is calculated in UTC in 14 places. Day-based food and focus data makes this matter.

**What feels off, as far as the code shows:** Home carries nine blocks, and ClickUp items due today are injected into it whether or not Rob chose them. 205 mirrored work tasks sit one tap away.

## 4. Approaches

| # | Approach | Trade-off |
|---|----------|-----------|
| 1 | Calm Home first, then food, then training data, as separate builds | Lowest risk of a half-finished app; slowest to the food log |
| 2 | Food log first, Home later | Fastest win on food; Home still feels off |
| 3 | All together in one build | Most complete; highest risk of stalling |

**Rob picked 3.** Claude's call within that: one plan, built in four checkpoints (section 9), each deployed and usable before the next starts. If the build stops at any checkpoint, nothing is wasted.

## 5. Design

### 5.1 Home (`/today`, rewritten)

```
Today · Mon 16 Nov      Ran 8 km yesterday   ⚙

Now: Meetings · 0:42                 [ Stop ]

ONE THING
  Draft CV summary            [ Start focus ]

Top 3                                  2 left
  ○ Reply to recruiter
  ○ Book physio

Fuel   1,240 / 2,400 kcal · 92 / 160 g   [ + ]

[ Close the day ]            (shown from 16:00)
```

- **Now row:** shows the running entry with Stop, or "Track time" when nothing is running.
- **One thing:** one task chosen in the morning plan. Stored per day.
- **Top 3:** unchanged behaviour, but only items Rob pinned.
- **Removed from Home:** ClickUp due-today list, Due Today section, nav link stack, done footer. Admin batch stays as a single collapsed row. Due and slipping items appear only in the morning plan and under More.
- **ClickUp:** nothing from ClickUp appears on Home unless pinned. The Work page stays as is, reached from More. The morning plan gets a "pull from work" row that opens ClickUp items due today for pinning.
- **Bottom nav:** Today · Inbox · Fuel · More (Tasks, Work, Slipping, Record, Settings).
- **Quick-add capture bar** stays.

### 5.2 Time entries (Time Intelligence folded in)

One table, one running entry at a time, two modes.

- **Categories** (from Time Intelligence): Deep Work, Meetings, Admin / Email, Reactive Work, Procrastinating, Personal Project, Learning, Rest / Recovery, Exercise.
- **Focus mode:** started from the one thing or a Top 3 item. Lengths 25, 50, 90, custom. Category is Deep Work. One-tap "distracted" counter, pause for a break. End asks what got done and what's next; "what's next" is saved as a capture unless the task is completed.
- **Track mode:** tap "Track time", pick a category, optional label. Runs open-ended until stopped. Picking another category switches: the running entry ends and the new one starts.
- **Energy:** an optional 1 to 5 tap when starting either mode. Skippable.
- **Timing:** `started_at` is stored on the server and elapsed time is calculated from timestamps, so reload or phone lock doesn't reset it. An entry left running is capped at four hours.
- **Phone quick-capture:** `POST /api/track` with the existing bearer token, for Rob's own Shortcuts: start a category, stop, or log a finished block of minutes.

### 5.3 Close the day

- Shows today's time by category, focus minutes, Top 3 done, food against target.
- Up to three journal prompts, edited in Settings. Answers saved per day.
- Pick tomorrow's one thing (optional).
- A skipped close-out leaves nothing to catch up on.
- `[TO COMPLETE: Rob's journal prompts. He types his own in Settings; the app ships with three neutral defaults.]`

### 5.4 Fuel

- Entry: label, kcal, protein. "Save as meal" tick.
- Saved meals listed by most used; one tap re-logs.
- Day target shown on Home and Fuel. Target comes from the activity-based calorie bands and protein range already defined in the nutrition-coach skill (not restated here).
- `[TO COMPLETE: rule mapping the day's training to a calorie band, taken from the nutrition-coach skill. Until supplied, the target is a manual setting.]`

### 5.5 Training and energy

- **Source:** Apple Health via iOS Shortcut (section 8). Data lands in one `activities` table and one optional `daily_health` row.
- Home shows one line: the most recent activity.
- Energy is self-rated on time entries. No inferred score in this build.
- **Record** page (under More):
  - Weekly card in plain sentences: focus minutes, time by category, distractions, days logged for food.
  - Heatmap: hour of day against category, last 14 days.
  - Procrastination hot spots: the hours where it most often lands.
  - Free windows: hours outside 08:00 to 18:00 that are usually untracked or rest.
  - Focus minutes on days after training versus rest days.
  - Each card appears only when there is enough data behind it (14 days for comparisons).

### 5.6 Timezone fix

All "today" calculations move to Europe/London through one helper in `lib/dates.ts`.

## 6. Data model (new)

| Table | Key columns |
|-------|-------------|
| `day_log` | `day` (pk), `one_thing_task_id` or `one_thing_clickup_id` (one thing may be a pinned work item), `kcal_target`, `protein_target`, `closeout` (jsonb), `closed_at` |
| `time_entries` | `id`, `day`, `mode` (focus/track), `category`, `energy` (1-5, nullable), `task_id` (nullable), `clickup_id` (nullable), `label`, `planned_minutes` (focus only), `started_at`, `ended_at`, `paused_at`, `paused_seconds`, `distractions`, `done_note`, `next_note` |
| `food_entries` | `id`, `day`, `label`, `kcal`, `protein_g`, `meal_id` (nullable), `created_at` |
| `saved_meals` | `id`, `name`, `kcal`, `protein_g`, `use_count` |
| `activities` | `source` (apple_health), `source_id` (pk together), `started_at`, `type`, `distance_m`, `moving_seconds`, `avg_hr`, `kcal` |
| `daily_health` | `day` (pk), `sleep_minutes`, `resting_hr`, `hrv` (all nullable; only filled by the Apple Health route) |
| `settings` (extended) | `journal_prompts` (jsonb), `default_kcal`, `default_protein` |

RLS follows the existing pattern (authenticated user). Any provider tokens sit in a table with no client policy, read only through the service role.

## 7. Constraints

- Phone first; every log action in two taps or fewer for the common case.
- No new runtime dependencies unless unavoidable.
- Existing capture API, Shortcuts and ClickUp sync keep working unchanged.
- Migrations are additive; no existing column is dropped.

## 8. Decisions (Rob, 16 Nov 2026)

1. **Training data source:** Apple Health via a daily iOS Shortcut posting to `/api/health`, reusing the capture-token pattern. No Strava (no subscription). Runna workouts reach Apple Health through the watch, so they arrive by the same route.
2. **Journal prompts:** ship three neutral defaults, editable in Settings. `[TO COMPLETE: Rob's own prompts, entered in Settings when ready.]`
3. **Calorie target:** manual setting to start. `[TO COMPLETE: band rule from the nutrition-coach skill, added later.]`
4. All of Claude's calls in section 10 accepted for now; to be refined in use.
5. **Time Intelligence** is folded in as one timer with two modes (section 5.2). The native iOS build (stopped at Phase 2 of 9) is not continued and there is no data to migrate. Rob will write his own Shortcuts against `/api/track`.

## 9. Build order (checkpoints)

1. Timezone helper, new tables, calm Home, one thing, bottom nav.
2. Time entries (focus and track), `/api/track`, close-out.
3. Fuel.
4. Training data route, Home activity line, Record page with heatmap.

## 10. Claude's calls (not agreed by Rob, open to change)

- Calories and protein only; manual entry with saved meals.
- Energy is self-rated per time entry, optional, not calculated.
- Tracking is optional and gaps are never flagged.
- Starting a new entry ends a running Track entry automatically; a running Focus session must be ended first.
- No in-app Claude analysis in this build.
- ClickUp removed from Home unless pinned.
- Due Today and done footer removed from Home.
- Record cards hidden until 14 days of data.
- Four checkpoints inside one build.
- Workout logging left out.

## 11. Left to the builder

- Component breakdown and styling within the existing dark Tailwind look.
- Exact timer UI and pause behaviour.
- Wording of Record sentences.
- Test approach (the repo has no tests today).
