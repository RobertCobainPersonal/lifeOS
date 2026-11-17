# Phone Shortcuts for LifeOS

**Status:** DRAFT. The endpoints are built and unit-tested. None of the Shortcut steps below have been run on a device.

All four endpoints use the same bearer token as the existing capture Shortcut (`CAPTURE_API_TOKEN`).

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <your capture token>` |
| `Content-Type` | `application/json` |

---

## 1. Daily Apple Health data — `POST /api/health`

Send once a day. Sending twice is safe: the same day and the same workout update rather than duplicate, and a figure missing from a later send leaves the stored one in place.

### Request body

```json
{
  "day": "2026-11-15",
  "sleep_minutes": 412,
  "resting_hr": 52,
  "hrv": 61,
  "workouts": [
    {
      "id": "optional unique id",
      "type": "Running",
      "start": "2026-11-15T07:02:00Z",
      "duration_seconds": 3120,
      "distance_m": 8040,
      "kcal": 640,
      "avg_hr": 148
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `day` | Yes | `YYYY-MM-DD`. Send yesterday's date with last night's sleep: a sleep figure filed under a day is compared with focus on the following day. |
| `sleep_minutes`, `resting_hr`, `hrv` | No | Numbers, or numbers as text. Anything missing or not a number is ignored. |
| `workouts` | No | A list, or a single object. |
| `workouts[].start` | Yes, per workout | ISO date and time. A workout without it is skipped. |
| `workouts[].id` | No | If absent, the workout is identified by its start time and type. |
| Other workout fields | No | Distance in metres, duration in seconds. |

### Response

- `200` `{ "activities": 1, "health": true }`
- `400` `{ "error": "day must be a date as YYYY-MM-DD" }`
- `401` wrong or missing token

### Shortcut outline

1. Personal automation: Time of Day, 07:00, daily, run without asking.
2. Get yesterday's date and format it as `yyyy-MM-dd`.
3. Find yesterday's Health samples for sleep, resting heart rate and heart rate variability, and reduce each to one number.
4. Find yesterday's workouts. For each, build a dictionary with `type`, `start` (ISO 8601), `duration_seconds`, `distance_m`, `kcal`.
5. Build the dictionary above and send it with Get Contents of URL (method POST, request body JSON, headers as in the table).

`[TO COMPLETE: Rob to build and test on his phone. Exact Shortcuts action names, the units Health returns (distance may come back in km or miles, duration in minutes) and how sleep is totalled need checking on the device, then record the working steps here.]`

Runna workouts reach this route as long as they are saved to Apple Health by the watch.

---

## 2. Time tracking — `POST /api/track`

For your own quick-capture Shortcuts.

### Start a category

```json
{ "action": "start", "category": "meetings", "label": "Standup", "energy": 4 }
```

`label` and `energy` (1 to 5) are optional. Starting a category ends whatever was being tracked.

### Stop

```json
{ "action": "stop" }
```

### Log a finished block ending now

```json
{ "action": "log", "category": "admin", "minutes": 30 }
```

`minutes` must be 1 to 240.

### Categories

`deep_work`, `meetings`, `admin`, `reactive`, `procrastinating`, `personal_project`, `learning`, `rest`, `exercise`

### Responses

- `200` `{ "entry": { ... } }`, or for stop `{ "stopped": true, "entry": { ... } }` / `{ "stopped": false }`
- `400` `{ "error": "..." }` unknown action or category, or minutes out of range
- `401` wrong or missing token
- `409` `{ "error": "focus_running" }` a focus session is running; end it in the app first
- `409` `{ "error": "tracking_running" }` on `log` while something is being tracked; send `stop` first
- `409` `{ "error": "busy" }` two starts arrived together; send it again

---

## 3. Calendar — `POST /api/calendar`

Send today's events each morning. Whatever you send **replaces** what is stored for the days covered, so a cancelled meeting disappears on the next run. Sending twice is safe.

### Request body

```json
{
  "from": "2026-11-17",
  "to": "2026-11-17",
  "events": [
    {
      "title": "Team stand-up",
      "start": "2026-11-17T09:30:00Z",
      "end": "2026-11-17T10:00:00Z",
      "location": "Room 2",
      "calendar": "Work",
      "all_day": false
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `from` | Yes | `YYYY-MM-DD`. First day covered. |
| `to` | No | Last day covered; defaults to `from`. At most 14 days. |
| `events` | No | A list, or a single object. An empty list clears the days. |
| `events[].title` | Yes, per event | An event without a title is skipped. |
| `events[].start` | Yes, per event | ISO date and time. Events outside `from` to `to` are skipped. |
| `events[].end` | No | Defaults to the start. |
| `events[].location`, `calendar`, `id` | No | |
| `events[].all_day` | No | `true`, `"Yes"` or `1`. All-day entries are listed but do not block free time. |

Only title, times, location and calendar name are stored. Notes, attendees and links are not read.

### Response

- `200` `{ "events": 4, "from": "2026-11-17", "to": "2026-11-17" }`
- `400` `{ "error": "..." }`
- `401` wrong or missing token

### Shortcut outline

1. Personal automation: Time of Day, 07:00, daily, run without asking.
2. Format the current date as `yyyy-MM-dd` for `from`.
3. Find Calendar Events where Start Date is today (choose the calendars to include).
4. Repeat with each event: build a dictionary with `title`, `start` and `end` (Format Date, ISO 8601, include time), `location`, `calendar` and `all_day`.
5. Build the outer dictionary and send it with Get Contents of URL (POST, JSON, headers as in the table).

To cover the week ahead, find events between today and six days from now and set `to` accordingly.

`[TO COMPLETE: Rob to build and test on his phone, then record the working steps here. The exact action names and how Shortcuts reports all-day events need checking on the device.]`

---

## 4. Capture — `POST /api/capture`

Unchanged. See `docs/superpowers/session-2-deploy-checklist.md`.
