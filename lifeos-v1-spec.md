# LifeOS — Product Spec v1 ("The Trust Layer")

**Owner:** Rob Cobain
**Date:** 10 June 2026
**Status:** Ready for build in Claude Code
**Build budget:** 5–10 hours over one week (1–2 hrs/day)

---

## 1. Problem Statement

Rob currently runs his life across five untrusted inboxes: email, Teams, mental notes, multiple paper notebooks, and ClickUp. Because no single system is trusted, his head remains the master copy — which causes dropped tasks (including personal/family commitments), recurring overwhelm, and a planning spiral:

1. A plan is made in a motivated moment.
2. An unplanned interruption lands (e.g. a 90-minute working session).
3. The plan has no cheap way to absorb the hit, so it dies.
4. Nothing indicates what to drop or defer; the day runs away.
5. Rob measures himself against the morning's intentions and feels worse. The spiral deepens.

Previous systems (Obsidian/RobOS, bullet journals, Apple Reminders) have failed at one or more of: **capture speed**, **resurfacing**, or **maintenance cost**.

### Root causes (in priority order)

| # | Failure mode | Description |
|---|---|---|
| 1 | Capture friction | No two-second path from email/Teams/thought → trusted system. Items die in email or notebooks. |
| 2 | Expensive replanning | Rebuilding a to-do list (rolling notebooks forward) is so costly it happens rarely; most days run on a stale or mental plan. |
| 3 | No resurfacing | Items that fall behind die silently rather than being flagged. |
| 4 | Energy mismatch | No way to separate admin tasks (low-energy windows) from deep work (high-engagement windows). |
| 5 | Fragmented work view | Work tasks live in ClickUp; personal tasks live nowhere reliable. Two worlds, one brain. |

---

## 2. Goals & Non-Goals

### Goals (v1)
- One trusted funnel: anything, from anywhere, captured in under two seconds.
- One Today view small enough to trust: top 3 deep-work items + an admin batch.
- ClickUp tasks visible alongside personal tasks (read-only in v1).
- Slipping items resurface automatically instead of dying.
- A two-minute "reset my day" flow when plans get blown up.
- Installable on iPhone home screen and desktop (PWA). Zero-maintenance daily use.

### Non-Goals (v1 — explicitly out of scope)
- ❌ Trackers (weight, training, golf) — **v2**
- ❌ Calendar sync — **v2**
- ❌ AI chat over data, resurfacing of notes/highlights, weekly review generation — **v3**
- ❌ Knowledge base / note-taking — Rob is not a heavy note-taker; business notes live in business directories
- ❌ Team process management or fixing team ClickUp adoption — this is a personal system; team visibility is read-only via ClickUp pull
- ❌ Writing back to ClickUp — read-only in v1 (status sync is a v1.5 candidate)
- ❌ Native iOS app — PWA + iOS Shortcut covers capture; no app-store overhead

### Guardrail
**Building the system must not become the project.** v1 ships this week within the 5–10 hour budget, then runs unchanged for a 2–3 week trust trial before anything is added. If v1 doesn't earn daily use, v2 doesn't happen.

---

## 3. Users

Single user (Rob). No multi-tenancy, no sharing, no permissions complexity. Auth exists only to protect the data.

---

## 4. v1 Features

### 4.1 Capture
The two-second rule: from any device, a thought/email/message becomes a captured item in ≤2 seconds with no decisions required at capture time.

- **Quick Add (in-app):** single text field, always one tap away. Enter = saved to Inbox. No required fields.
- **iOS Shortcut → API:** a `POST /api/capture` endpoint secured with a personal API token. Enables:
  - Share sheet capture from Mail/Teams/Safari (shares text + source URL where available)
  - Home-screen/Action-button Shortcut with dictation (voice → text → capture)
  - Apple Watch capture via the same Shortcut
- **Captured item stores:** raw text, source (`manual` / `share` / `voice` / `email`), optional URL, timestamp.
- **Optional AI parse (stretch goal, only if hours allow):** on capture, call Claude API to suggest a cleaned title, due date, and energy tag — suggestions only, confirmed at triage. If time is tight, this drops to v1.5 without affecting anything else.

### 4.2 Inbox & Triage
- Inbox = all captured items not yet processed.
- Triage actions (one tap each):
  - **→ Task:** sets domain (`work` / `personal`), energy (`deep` / `admin`), optional due date
  - **→ Someday:** parked, excluded from Today and Slipping
  - **→ Done** (it was just a note-to-self already handled)
  - **→ Delete**
- Inbox count badge visible from Today view. Triage is designed to be done in batches (e.g. start/end of day), not at capture time.

### 4.3 ClickUp Pull (read-only)
- Personal API token; poll ClickUp for tasks **assigned to Rob** that are open.
- Display in Today and in a "Work (ClickUp)" list with status, due date, and deep-link to the ClickUp task.
- Refresh on app load + manual refresh. No webhooks in v1.
- ClickUp tasks can be **pinned into Today's top 3** but are never edited locally.

### 4.4 Today View (the home screen)
The only view Rob needs to look at during the day:
- **Top 3** — deep-work items chosen at the morning plan (local tasks or pinned ClickUp tasks)
- **Admin batch** — all `admin`-energy tasks due/available, presented as one collapsible batch to burn through in a low-energy window
- **Due today** — anything (local or ClickUp) with today's due date not already above
- **Inbox badge** — count of untriaged captures
- Checking off an item is one tap. Done items collapse to a "done today" footer (small visible win, anti-spiral).

### 4.5 Slipping View
- Any open task untouched (no status change, no edit, no snooze) for **N days** (default 5, configurable) appears in Slipping.
- Slipping actions: **do today** (adds to Today) / **reschedule** / **someday** / **delete**.
- Slipping count shows as a gentle indicator on Today — visible, never shaming.

### 4.6 Reset My Day (the replan flow)
The anti-spiral feature. One button on Today: **"Reset my day."**
1. Shows remaining unfinished Top 3 + due items.
2. Rob re-picks at most 1–3 things that still matter *today*; everything else is auto-deferred to tomorrow or back to the list — explicitly, guilt-free, in under two minutes.
3. Deferred items are marked `deferred_by_reset` so they surface first in tomorrow's morning plan.

### 4.7 Morning Plan (lightweight)
- On first open of the day, a 60-second prompt: yesterday's deferred items + due items + slipping items → pick today's Top 3 and confirm the admin batch.
- Skippable. Never blocks capture.

---

## 5. Data Model (Supabase / Postgres)

```sql
-- captures: raw inbox
captures (
  id uuid pk,
  raw_text text not null,
  source text check (source in ('manual','share','voice','email')),
  url text,
  created_at timestamptz default now(),
  triaged_at timestamptz,           -- null = still in inbox
  triage_result text                -- 'task' | 'someday' | 'done' | 'deleted'
)

-- tasks: the working list
tasks (
  id uuid pk,
  capture_id uuid fk -> captures,   -- nullable (tasks can be created directly)
  title text not null,
  domain text check (domain in ('work','personal')),
  energy text check (energy in ('deep','admin')),
  due_date date,
  status text check (status in ('open','done','someday','deferred')) default 'open',
  is_top3 boolean default false,
  top3_date date,                   -- which day it was a top-3 for
  deferred_by_reset boolean default false,
  last_touched_at timestamptz default now(),  -- drives Slipping
  completed_at timestamptz,
  created_at timestamptz default now()
)

-- clickup_cache: read-only mirror
clickup_tasks (
  clickup_id text pk,
  title text,
  status text,
  due_date date,
  url text,
  list_name text,
  pinned_top3_date date,            -- local pin only; never written back
  synced_at timestamptz
)

-- settings: single-row config
settings (
  id int pk default 1,
  slipping_days int default 5,
  clickup_token_set boolean default false
)
```

`last_touched_at` updates on any edit, completion, snooze, or reset action. Slipping = `status='open' AND last_touched_at < now() - slipping_days`.

---

## 6. Stack & Hosting

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Rob's working stack (Tour Census) — zero learning curve |
| Database | **Supabase** (Postgres) | Known stack; row-level security; free tier sufficient |
| Auth | **Supabase Auth** (single user, email magic link) | Simpler than Clerk for a one-user app; Clerk is fine if preferred |
| Styling | Tailwind | Speed |
| App shell | **PWA** (manifest + service worker) | Home-screen install on iPhone + desktop, push-capable later (v2) |
| Hosting | **Netlify or Vercel** | Rob has Netlify connected; either works |
| Capture API | Next.js route handler + bearer token | Consumed by iOS Shortcut |
| ClickUp | ClickUp REST API v2, personal token | Read-only task pull |
| AI parse (stretch) | Anthropic API, single completion call | Optional; degrade gracefully if absent |

**Mobile-first UI.** This app lives on the iPhone home screen; desktop is secondary. Big tap targets, one-handed triage.

---

## 7. Build Plan (sized to 5–10 hours with Claude Code)

| Session | ~Time | Deliverable |
|---|---|---|
| 1 | 1.5–2h | Project scaffold, Supabase schema + auth, deploy pipeline live (deploy on day one, not at the end) |
| 2 | 1.5–2h | Capture: quick-add UI + `/api/capture` endpoint + iOS Shortcut built and tested from phone |
| 3 | 1.5–2h | Inbox + triage flow; tasks list |
| 4 | 1.5–2h | Today view (Top 3, admin batch, due today) + morning plan prompt |
| 5 | 1–2h | ClickUp pull + display + pinning; Slipping view; Reset My Day |
| Buffer | 0–1h | PWA polish (manifest, icons, install), settings, AI parse if time remains |

**Rule:** each session ends with a deployed, usable increment. Capture (session 2) is the priority — start capturing real items into the system from day two even while the rest is being built.

---

## 8. Success Criteria (the 2–3 week trust trial)

v1 earns v2 if, after 2–3 weeks of daily use:

1. **Capture habit:** ≥90% of incoming tasks/thoughts go into the app, not email/notebooks/head (notebooks retired).
2. **Daily contact:** Today view opened and morning plan done ≥5 days/week.
3. **Zero silent deaths:** nothing important dropped — at home or work — that wasn't visible in Slipping first.
4. **Reset used, not avoided:** on blown-up days, Reset My Day is used and the evening feeling is "replanned" not "failed."
5. **Felt overwhelm is down** — subjective, but it's the actual point.

If these hold → **v2: trackers (customisable cards: weight, training minimums, golf practice), Google Calendar sync, push notifications.**
Then → **v3: compounding layer — AI chat over all data, resurfacing, generated weekly reviews — and Obsidian is retired.**

---

## 9. Open Decisions (confirm before/while building)

1. **App name** — working title "LifeOS" (RobOS is taken by the Obsidian vault; renaming later is trivial).
2. Supabase Auth vs Clerk (spec recommends Supabase Auth for simplicity).
3. Slipping threshold default — 5 days suggested; tune in trial.
4. AI parse in v1 or v1.5 — recommend deferring unless sessions 1–5 run ahead of schedule.
5. ClickUp scope — all open tasks assigned to Rob, or specific lists/spaces only?
