# Phone Shortcuts for LifeOS

**Status:** DRAFT. The endpoints are built and unit-tested. None of the Shortcut steps below have been run on a device.

All the endpoints use the same bearer token as the existing capture Shortcut (`CAPTURE_API_TOKEN`).

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

## 2. Time tracking — `GET` and `POST /api/track`

### The one-button "Track" Shortcut

One Shortcut that shows your activity list and starts whatever you tap, or stops the timer. The list comes from LifeOS each time, so anything you add or rename in **Settings → What you track time on** shows up without editing the Shortcut.

**Build it (Shortcuts app on the iPhone, new Shortcut, name it "Track"):**

1. **Get Contents of URL** — `https://rc-lifeos.netlify.app/api/track`, Method **GET**, Header `Authorization` = `Bearer <your capture token>`.
2. **Get Dictionary Value** — Key `options`, from Contents of URL.
3. **Choose from List** — List: Dictionary Value. Prompt: "Track what?". The first item is always **Stop tracking**; then each group, followed by its parts as "Hockey / Playing".
4. **Get Contents of URL** — same URL, Method **POST**, same `Authorization` header, Request Body **JSON** with two fields:
   - `action` (Text) = `pick`
   - `choice` (Text) = Chosen Item
5. **Get Dictionary Value** — Key `message`, from Contents of URL.
6. **Show Notification** — Dictionary Value. You will see "Tracking Hockey · Playing", "Stopped", or why it could not start.

**Putting it one tap away:**

- **Home screen:** in the Shortcut, tap the share icon → *Add to Home Screen*.
- **Action button** (iPhone 15 Pro and later): Settings → Action Button → Shortcut → Track.
- **Back Tap:** Settings → Accessibility → Touch → Back Tap → Double Tap → Track.
- **Control Centre** (iOS 18 and later): edit Control Centre → Add a Control → Shortcuts → Track.
- **Lock screen:** customise the lock screen → add the Shortcuts widget → Track.

### On the Apple Watch

The same Shortcut runs on the watch. The watch makes the web requests itself, over the paired phone or its own Wi-Fi or mobile data.

1. In the Shortcut on the iPhone, tap the **ⓘ** (details) button → turn on **Show on Apple Watch**.
2. On the watch, open the **Shortcuts** app and tap Track. The list appears as a scrolling menu; tap one and the notification shows on the wrist.
3. For one tap from the watch face: long-press the face → Edit → Complications → choose **Shortcuts** → Track.
4. On Apple Watch Ultra you can also set the **Action button** to run Track (Watch Settings → Action Button → Shortcut).

If the watch shows "couldn't communicate" or similar, the watch could not reach the internet; try again with the phone nearby.

### Direct requests (for other Shortcuts)

Start an activity. `activity` can be "Group / Part", a group or part name that is unique, or one of the older category keys (`meetings`, `deep_work`, …), which still work:

```json
{ "action": "start", "activity": "Hockey / Playing", "label": "Cup match", "energy": 4 }
```

`label` and `energy` (1 to 5) are optional. Starting ends whatever was being tracked.

Stop:

```json
{ "action": "stop" }
```

Pick from the menu (what the Track Shortcut sends; "Stop tracking" stops):

```json
{ "action": "pick", "choice": "Downtime / TV" }
```

Log a finished block ending now (`minutes` 1 to 240):

```json
{ "action": "log", "activity": "Home / Housework", "minutes": 30 }
```

### Responses

Every response has a short `message` you can show as a notification.

- `200` `GET` → `{ "options": ["Stop tracking", "Work", "Work / Deep work", …] }`
- `200` `POST` → `{ "entry": { … }, "message": "Tracking Hockey · Playing" }`, or for stop `{ "stopped": true, … }` / `{ "stopped": false, "message": "Nothing was running" }`
- `400` `{ "error": "unknown_activity", "options": [ … ] }` the name is not in the list (or is archived, or matches two parts such as "Playing" — send "Hockey / Playing")
- `400` `{ "error": "..." }` unknown action, missing activity, or minutes out of range
- `401` wrong or missing token
- `409` `{ "error": "focus_running" }` a focus session is running; end it in the app first
- `409` `{ "error": "tracking_running" }` on `log` while something is being tracked; stop first
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

An event that crosses midnight or runs for several days is stored once per day it touches, clipped to that day. A part that fills a whole day is treated as all-day, so it is listed but does not count as meeting time or block free time.

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

---

## 5. Done: say what you got through

One dictation that adds a line to today's Forever Notes daily note **and** saves it to LifeOS (Home, the day close, the weekly review and **More → What I got done**).

### Build it
New Shortcut, named **Done**.

1. **Dictate Text**. Stop listening: **After Pause**. (On the Mac or if you'd rather type, use **Ask for Input** instead.)
2. **Your existing Forever Notes step** that appends to today's daily note. Copy it from one of your current Shortcuts and set the text to `✓ ` followed by *Dictated Text*.
3. **Get Contents of URL**
   - URL: `https://rc-lifeos.netlify.app/api/done`
   - Method: **POST**, with the `Authorization` and `Content-Type` headers
   - Request Body: **JSON**, field `text` (Text) = *Dictated Text*
4. **Get Dictionary Value**: key `message` → **Show Notification**: *Dictionary Value*. You should see "Logged 1 thing for today".

Say one thing per run ("sent the coverage summary to Marc"). Saying "Done:" at the start is fine; LifeOS strips it. For a list, type one per line (Ask for Input) or use **What I got done → Fill in a day**.

### Put it one tap away
- ☐ Action button, Back Tap or Control Centre (as for Track). The Action button is the natural home for Done if Track lives on tags.
- ☐ **Watch:** ⓘ → **Show on Apple Watch**. Dictation works on the wrist. ⚠️ The Forever Notes step may not run on the watch; if it errors there, make a watch copy without step 2.
- ☐ **Siri:** "Hey Siri, Done" runs it by name.

### Test it
- ☐ Run it and say "testing the done log". The line appears in today's daily note and under **Got done today** on Home. Remove it in LifeOS with ✕.

---

## 6. 17:30 nudge: "What did you get through today?"

- ☐ Shortcuts → **Automation** → **+** → **Time of Day** → 17:30, Weekdays → **Run Immediately** → choose the **Done** Shortcut.
- ⚠️ iOS may not open dictation from an automation while the phone is locked. If you just get a notification, tap it to run Done. If nothing appears at all, use a repeating Reminder at 17:30 called "Log what you got done" instead.
- Missed a whole day? **More → What I got done → Fill in a day**: pick the date and paste or type one item per line. It goes back 30 days.

---

## 7. NFC tags: tap to start timing

Each tag starts one activity, with no menu. Tapping a different tag switches, because starting anything ends what was running.

### Set up one tag (repeat per tag)
1. Shortcuts → **Automation** → **+** → **NFC** → **Scan**, hold the tag to the top of the phone, and name it (e.g. "Desk").
2. **Run Immediately**, with **Notify When Run** off.
3. Choose **New Blank Automation** and add:
   1. **Get Contents of URL**
      - URL: `https://rc-lifeos.netlify.app/api/track`
      - Method: **POST**, with the `Authorization` and `Content-Type` headers
      - Request Body: **JSON**: `action` (Text) = `start`, `activity` (Text) = the name exactly as it appears in the Track menu, e.g. `Work / Deep work`
   2. **Get Dictionary Value**: key `message` → **Show Notification**: *Dictionary Value*

For a **Stop** tag, use one field only: `action` (Text) = `stop`.

### Where to put them (fill in as you go)

| Tag | Where | Activity sent |
|-----|-------|---------------|
| ☐ Desk | Work desk / home office | `Work / Deep work` |
| ☐ Kitchen | Fridge or worktop | `Home / Cooking` |
| ☐ Sofa | Coffee table or remote | `Downtime / TV` |
| ☐ Hockey bag | Inside the bag | `Hockey / Playing` |
| ☐ Golf bag | Inside the bag | `Golf / Playing` |
| ☐ Front door | By the door | stop |

### Test it
- ☐ Tap the Desk tag. The notification reads "Tracking Work · Deep work" and the timer shows in LifeOS.
- ☐ Tap the Kitchen tag. It switches to "Home · Cooking".
- ☐ Tap the Front door tag. "Stopped".

⚠️ NFC automations only run while the phone is unlocked, and the tag has to touch the top edge of the phone. If you rename an activity in Settings, update the tag's `activity` text to match. The Track menu updates itself, but tags don't.

---
