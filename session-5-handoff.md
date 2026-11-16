# Session 5 Handoff — Daily Loop, Time, Fuel and Record

Branch: `feat/daily-loop`. Not merged. Production (`main`) is unchanged apart from the database, which has new tables and three new `settings` columns (additive).

Design: `docs/superpowers/specs/2026-11-16-daily-loop-fuel-energy-design.md`
Plan: `docs/superpowers/plans/2026-11-16-daily-loop-fuel-energy.md`

## What was built

| Area | What it does |
|------|--------------|
| Days | Every "today" is now Europe/London (`lib/dates.ts`). Fixes late-evening entries landing on the wrong day in summer. |
| Home | Now row, One thing, Top 3, Fuel line, collapsed Admin batch, Close the day (from 16:00), Reset My Day. ClickUp items appear only if pinned. Due Today, the link stack and the done footer are gone. |
| Navigation | Today · Inbox · Fuel · More. More holds Tasks, Work, Slipping, Track time, Record, Settings. |
| Morning plan | First tap is the one thing, up to two more. Adds Slipping tasks, a collapsed "Pull from work" list, and last night's pick pre-selected. |
| Time (`/time`) | One running entry at a time. Focus: 25 / 50 / 90 / custom countdown on a task, Distracted counter, Break, end notes. Track: nine categories, tap to start or switch. Optional energy 1 to 5. Capped at four hours. |
| Close (`/today/close`) | Day summary, up to three journal prompts, optional pick for tomorrow's one thing. Every field optional. |
| Fuel (`/fuel`) | Calories and protein against the day's target, saved meals (one tap), manual entry. |
| Record (`/record`) | Last 7 days in sentences, 14-day heatmap, procrastination hours, free windows and training/focus comparison (the last two appear after 14 days of data). |
| Settings | Daily targets, journal prompts. |
| API | `POST /api/track` and `POST /api/health`, same bearer token as `/api/capture`. See `docs/health-shortcut-setup.md`. |

## Database

Migration `supabase/migrations/20261116000000_daily_loop.sql`, already applied to the live `lifeos` project:
`day_log`, `time_entries`, `saved_meals`, `food_entries`, `activities`, `daily_health`, plus `settings.journal_prompts`, `default_kcal` (2400), `default_protein` (160). RLS on all, same policy as existing tables.

## How it was checked

- 110 unit tests (`npm test`) covering dates, timer maths, input validation, health payloads, the weekly summary and heatmap figures.
- `npm run lint` and `npm run build` pass.
- New screens rendered with sample data at 390 px and inspected.
- Database: tables, RLS and the one-open-entry rule confirmed by SQL.

## Not checked — test these on the branch preview

No signed-in browser session or service-role key was available during the build, so nothing below has been run end to end against real data:

1. Morning plan → Set today → Home shows the one thing and Top 3.
2. Start focus from the one thing, lock the phone, come back: the clock is right. End with a "what's next" note: it appears in the Inbox.
3. Track time: start Meetings, tap Admin, check one ended and one running entry. Stop from Home.
4. Fuel: log a meal with "Save as a meal", then re-log it in one tap. Try `5,20` as calories: inline message, nothing saved.
5. Close the day, reopen it: answers are kept. Pick tomorrow's one thing and check it is pre-selected next morning.
6. Settings: change targets and prompts.
7. `curl` each of `/api/track` (start, stop, log) and `/api/health` with the capture token; send the health payload twice and confirm no duplicates.
8. Record with real entries.

## Open items

- `[TO COMPLETE: journal prompts]` — three neutral defaults are in place; replace them in Settings.
- `[TO COMPLETE: calorie band rule]` — target is a manual setting; the activity-based bands from the nutrition-coach skill are not wired in.
- `[TO COMPLETE: Apple Health Shortcut]` — endpoint is ready; the Shortcut has to be built and tested on the phone.
- `[TO COMPLETE: /api/track Shortcuts]` — Rob to write his own.
- `@types/node` moved from ^20 to ^22 (needed by the test runner). Check the Netlify build is happy.

## Deviations from the plan

See the "Rulings" list in the build summary. The main ones: the capture bar sits above the bottom navigation on Home; the morning plan now clears today's ClickUp pins before applying the plan; an entry stopped after the four-hour cap is stored as ending at the cap.
