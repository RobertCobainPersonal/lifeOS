# Data export and access

**Status:** DRAFT

## Who can read the data

- Every table is restricted to one account, recorded in `app_owner`. Migration: `supabase/migrations/20261117064000_owner_only_access.sql`.
- Checked on 17 Nov 2026 by simulating three sessions against the live database: the owner saw all rows and could write; a different signed-in account and a signed-out visitor saw nothing and could not write.
- The phone endpoints (`/api/capture`, `/api/track`, `/api/health`, `/api/calendar`) use the bearer token and the service role, which bypasses these rules. Keep that token private.
- The sign-in screen no longer creates accounts. This is a courtesy, not a control: `[TO COMPLETE: Rob to switch off new sign-ups in the Supabase dashboard under Authentication.]`

## Export

Settings → Your data → Download my data, or `GET /api/export` while signed in.

The file is JSON:

```json
{
  "format": "lifeos-export",
  "version": 1,
  "exported_at": "2026-11-17T06:40:00.000Z",
  "counts": { "tasks": 60, "…": 0 },
  "tables": { "tasks": [ … ], "…": [] }
}
```

Tables are listed parents first (projects before tasks, saved meals before food entries, habits before ticks).

## Restoring

There is no restore button. To restore into an empty database, apply the migrations, then insert each table's rows in the order they appear in the file. `[TO COMPLETE: a restore script, if this becomes something to rely on.]`
