# VSHARES — Gate 1 execution plan: apply migration 9 to DEVELOPMENT

- **Purpose:** the exact, owner-run sequence to apply **migration 9**
  (`content_media`) to the **development** Supabase project only. Preparation and
  read-only verification are done; **this session does not and cannot execute any
  remote command** (no Supabase CLI, no DB route from here).
- **Target project:** `apgchptregdpswiwmyua` (`vshare-development`).
- **Branch/commit verified:** `claude/gallant-mendel-xey567` @ `7283816`.
- Every ⛔ is a hard stop needing explicit owner approval.

## Step 0 — Owner confirms the target (read-only)
Run on Windows Git Bash, in the repo:
```bash
supabase projects list          # confirm you are linked to the dev project
supabase migration list         # read-only: shows which migrations are applied remotely
```
Expected: migrations **1–8 applied**, migration 9 (`20261118120000`) **not yet
applied**. If 1–8 are not all applied, **⛔ STOP** — do not apply 9.

## Step 1 — ⛔ Owner approval checkpoint
Confirm, in writing, intent to apply migration 9 to **dev only**. Do not proceed
without it.

## Step 2 — Apply migration 9 (schema only; publishes nothing)
```bash
supabase db push
```
**Expected output:** Supabase applies exactly the one pending migration
`20261118120000_content_media.sql` and reports success. It creates the
`media_provider` type, the `content_media` table, two indexes, RLS + two select
policies, and a `select` grant to `anon, authenticated`. **No data is written.**

## Step 3 — Post-migration read-only verification (SQL editor / psql)
```sql
-- table + RLS
select relrowsecurity from pg_class where relname = 'content_media';            -- t
-- least-privilege grants: SELECT only to app roles
select grantee, privilege_type from information_schema.role_table_grants
  where table_name = 'content_media' and grantee in ('anon','authenticated');   -- SELECT only
-- policies
select policyname from pg_policies where tablename = 'content_media';           -- *_select_published, *_select_staff
-- indexes
select indexname from pg_indexes where tablename = 'content_media';             -- content_idx, status_idx, 2 unique, pkey
-- nothing visible yet
select count(*) from public.content_media;                                      -- 0
```
As the **anon** client, confirm `/learn` still renders cards only (no media) and
the app is healthy. **⛔ STOP** here — publishing media is a separate gate.

## Failure & recovery
- **`supabase db push` errors:** read the message. If it failed **before** any
  object was created, fix and retry. If it failed **after** the type but before
  the table (partial apply), the migration is **not idempotent** — recover first:
  ```sql
  drop table if exists public.content_media;
  drop type  if exists public.media_provider;
  ```
  then re-run `supabase db push`.
- **Full rollback (dev only):** the same two `drop` statements. Migration 9 is
  additive and alters no existing table or policy, so rollback loses no other
  data.

## Rollback limitations
- Migrations are **forward-only**; there is no automatic down-migration. Rollback
  is the manual `drop` above.
- `create type` / `create table` are **not** `if not exists`, so re-running a
  partially-applied migration errors until the recovery `drop`s are run. This is
  the standard pattern across migrations 1–9.

## What this plan never does
No production target, no data write, no publication, no RLS weakening, no secret.
Media stays invisible until a human moderator publishes a reviewed row (a later,
separately-approved gate — see `VSHARES_MEDIA_ACTIVATION_PROCEDURE.md`).
