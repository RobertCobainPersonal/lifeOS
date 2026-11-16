# Phone Shortcuts for LifeOS

**Status:** DRAFT. The endpoints are built and unit-tested. None of the Shortcut steps below have been run on a device.

All three endpoints use the same bearer token as the existing capture Shortcut (`CAPTURE_API_TOKEN`).

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
| `day` | Yes | `YYYY-MM-DD`. The day the sleep and heart figures belong to. |
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

---

## 3. Capture — `POST /api/capture`

Unchanged. See `docs/superpowers/session-2-deploy-checklist.md`.
