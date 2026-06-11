# Session 2 Deploy Checklist

Complete these steps in order. Code has already been pushed to GitHub and Netlify is deploying.

## ~~Step 1: Get your Netlify URL~~ ✓

Site URL: **`https://rc-lifeos.netlify.app`**

## Step 2: Add env var in Netlify

1. In Netlify dashboard → your LifeOS site → **Site configuration** → **Environment variables**
2. Click **Add variable**:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (copy from your `.env.local` file — line starting with `SUPABASE_SERVICE_ROLE_KEY=`)
3. Click **Save**
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**
5. Wait for the deploy to complete (status shows "Published")

**Also verify:** `CAPTURE_API_TOKEN` is already in Netlify env vars (added in Session 1). If not, add it with the same value as in your local `.env.local`.

## Step 3: Smoke-test the live API

Once deployed, open Terminal and run:

```bash
TOKEN=$(grep CAPTURE_API_TOKEN /Users/robertcobain/Developer/personal/lifeOS/.env.local | cut -d= -f2)

curl -s -X POST https://rc-lifeos.netlify.app/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text": "live API test from curl", "source": "manual"}'
```

Expected response: `{"id":"<uuid>","created_at":"<timestamp>"}`

If you get a 500 error, the `SUPABASE_SERVICE_ROLE_KEY` env var was not set correctly. Go back to Step 2.

## Step 4: Set up the Share Sheet Shortcut (iPhone)

### Create the shortcut

1. Open **Shortcuts app**
2. Tap **+** (create new)
3. Rename to **"Capture to LifeOS"**

### Add Action 1 — Receive Input

1. Tap **Add action**
2. Search for **Receive**
3. Tap **Receive from Share Sheet**
4. In "Content Types": toggle **Text** ON and **URLs** ON
5. Toggle **If there's no input** to **Continue**

### Add Action 2 — Text

1. Tap **Add action**
2. Search for **Text**
3. Tap **Text** (the standalone Text action — not Receive)
4. In the text field, tap the **variable icon** (looks like `{}`), tap **Shortcut Input**
   - This action now outputs the text that was shared

### Add Action 3 — Get Contents of URL

1. Tap **Add action**
2. Search for **Get Contents of URL**
3. Set **URL** to: `https://rc-lifeos.netlify.app/api/capture`
4. Tap **Show More**
5. Set **Method** to **POST**
6. Tap **+ Headers** twice to add two headers:
   - **Header 1:** Key = `Authorization`, Value = `Bearer <paste your CAPTURE_API_TOKEN from .env.local>`
   - **Header 2:** Key = `Content-Type`, Value = `application/json`
7. Set **Request body** to **JSON**
8. Tap **+ Body** twice to add two fields:
   - **Field 1:** Key = `text`, Value = tap variable icon → select **Text** (the variable from Action 2)
   - **Field 2:** Key = `source`, Value = type `share` (literally)

### Add Action 4 — Show Notification

1. Tap **Add action**
2. Search for **Show Notification**
3. Set **Title** to: `Captured ✓`
4. Set **Body** to: tap variable icon → select **Shortcut Input**

### Add to Share Sheet

1. Tap the **ⓘ** icon at the top right
2. Scroll down and toggle **Show in Share Sheet** to ON
3. Tap **Done**

### Test the Share Sheet shortcut

1. Open **Teams** app (or Safari, or any app with text)
2. Find a message or page you want to capture
3. Tap **Share**
4. Find **Capture to LifeOS** and tap it
5. You should see the notification "Captured ✓"
6. Verify in Supabase: open your project → **Table Editor** → `captures` table
7. Look for a new row with:
   - `text`: the message/URL you shared
   - `source`: `share`
   - `created_at`: just now

## Step 5: Set up the Voice Shortcut (iPhone)

### Create the shortcut

1. Open **Shortcuts app**
2. Tap **+** (create new)
3. Rename to **"Capture to LifeOS (Voice)"**

### Add Action 1 — Dictate Text

1. Tap **Add action**
2. Search for **Dictate**
3. Tap **Dictate Text**
4. Set **Language** to **Default**
   - This action outputs the text you speak

### Add Action 2 — Get Contents of URL

1. Tap **Add action**
2. Search for **Get Contents of URL**
3. Set **URL** to: `https://rc-lifeos.netlify.app/api/capture`
4. Tap **Show More**
5. Set **Method** to **POST**
6. Tap **+ Headers** twice:
   - **Header 1:** Key = `Authorization`, Value = `Bearer <paste your CAPTURE_API_TOKEN from .env.local>`
   - **Header 2:** Key = `Content-Type`, Value = `application/json`
7. Set **Request body** to **JSON**
8. Tap **+ Body** twice:
   - **Field 1:** Key = `text`, Value = tap variable icon → select **Dictated Text**
   - **Field 2:** Key = `source`, Value = type `voice`

### Add Action 3 — Show Notification

1. Tap **Add action**
2. Search for **Show Notification**
3. Set **Title** to: `Captured ✓`
4. Set **Body** to: tap variable icon → select **Dictated Text**

### Add to Home Screen

1. Tap the **ⓘ** icon at the top right
2. Scroll down and tap **Add to Home Screen**
3. Customize the icon/name if desired
4. Tap **Add**

### Test the Voice shortcut

1. Tap the **"Capture to LifeOS (Voice)"** icon on your home screen
2. Say something: **"Follow up with Jane about the Q3 budget"**
3. You should see the notification "Captured ✓"
4. Verify in Supabase `captures` table:
   - Look for a new row with:
     - `text`: your dictated text
     - `source`: `voice`
     - `created_at`: just now

## Step 6: Verify All Three Capture Paths

You now have three ways to capture:

- **Web quick-add** (in-browser, authenticated) ✓
- **Share Sheet** (from Teams, Safari, any app) ✓
- **Voice dictation** (home screen icon) ✓

Check the Supabase `captures` table. You should see rows with `source` values of:
- `manual` (from the in-app quick-add)
- `share` (from the iOS Share Sheet)
- `voice` (from the iOS Voice shortcut)

## Troubleshooting

### "Invalid API token" or 401 errors
- Double-check the `CAPTURE_API_TOKEN` in your `.env.local`
- Make sure it matches exactly (no spaces, no trailing newlines)
- Re-paste into the shortcut headers

### "Cannot reach server" or 503 errors
- Check that Netlify deploy completed successfully
- Check that `SUPABASE_SERVICE_ROLE_KEY` was added to Netlify env vars
- Trigger another deploy in Netlify and wait for completion

### Shortcut doesn't appear in Share Sheet
- In Shortcuts app, tap the shortcut → **ⓘ** → make sure **Show in Share Sheet** is ON
- Restart the device if the shortcut still doesn't appear

### Text/Voice isn't being captured to Supabase
- Check the Netlify deploy logs for errors
- Verify the `captures` table exists in Supabase
- Try the curl test from Step 3 to isolate whether the API endpoint itself works

## Session 2 Complete ✓

All Session 2 implementation work is done:
- Supabase admin client set up
- POST `/api/capture` endpoint deployed
- QuickAdd web component wired into Today page
- iOS Shortcuts configured for Share Sheet and voice capture

Archive this checklist once complete.
