# VSHARES — multimedia activation procedure (DEVELOPMENT only)

- **Scope:** a step-by-step runbook for the **owner** to activate approved media
  in the **development** environment. It is executed by the owner, not by this
  session. Nothing here runs remotely from the repo.
- **Companion:** `VSHARES_MIGRATION_9_CHECKLIST.md` (the migration review).
- **Golden rule:** every `STOP` below requires explicit owner approval before
  continuing. Production is out of scope.

## Stage 0 — Preconditions (STOP before proceeding)
- [ ] Branch `claude/gallant-mendel-xey567` is the source of truth; local tests
      green (`npm run typecheck && npm run lint && npm test && npm run build`).
- [ ] Migrations **1–8 already applied** on the dev project.
- [ ] A dev Supabase project you control; you have a staff/moderator account.
- [ ] You accept that this publishes **real approved media** to the **dev** feed.
- **STOP** — approve moving to Stage 1.

## Stage 1 — Apply migration 9 (schema only; publishes nothing)
```bash
# From the repo root, Windows Git Bash, against the DEV project:
supabase db push
```
Post-migration read checks (run as the service role / SQL editor):
```sql
-- table exists, RLS on
select relrowsecurity from pg_class where relname = 'content_media';   -- expect t
-- least-privilege grants: SELECT only to anon/authenticated
select grantee, privilege_type from information_schema.role_table_grants
where table_name = 'content_media';                                    -- expect only SELECT
-- policies present
select policyname from pg_policies where tablename = 'content_media';  -- select_published, select_staff
-- nothing is visible yet
select count(*) from public.content_media;                             -- expect 0
```
- **Failure handling:** if `supabase db push` errors, do **not** retry blindly;
  read the error, confirm migrations 1–8 are applied, and check the SQL. If the
  table was partially created, run the recovery below.
- **STOP** — approve moving to Stage 2.

## Stage 2 — RLS verification (before any publish)
As an **anonymous** client (anon key) and as a **non-staff** user, confirm:
```sql
-- anon/authenticated non-staff: no rows until something is published
select count(*) from public.content_media;                             -- expect 0
```
Insert a **draft** media row as the service role, then confirm a non-staff client
still sees **0** (draft is hidden), and a staff client sees **1**. Delete the test
row afterwards. (This mirrors `270_content_media.sql`, which already proves it
locally.)
- **STOP** — approve moving to Stage 3 (first real publish).

## Stage 3 — First approved publish (human editorial)
For each of the five candidate videos (see `VSHARES_MEDIA_EDITORIAL_INVENTORY.md`):
1. A human **watches** the video and confirms the educational objective.
2. Confirms attribution and that embedding is allowed on our domain.
3. Records a factual-verification note; adds a balancing note for debated claims
   (e.g. "Grit").
4. Publishes via the moderation path (service-role / SECURITY DEFINER insert with
   `status='published'`, `reviewed_at`, `embeddable=true`) — **never** by granting
   client write. High-impact topics require a **second reviewer**.
- Post-publish read check: an anonymous client now sees exactly the approved rows:
```sql
select provider, title from public.content_media where status = 'published';
```
- Open `/learn` in the dev app (configured with the dev anon key) and confirm the
  approved media section renders below the value session, with attribution and
  captions, and nothing autoplays.
- **STOP** — approve any further publishing.

## Failure handling (any stage)
- A read failure after activation is non-fatal: `/learn` falls back to cards-only
  and logs `media_read_failed` with a category + code (no PII). Investigate the
  category (permission/connection) before retrying.
- If the dev feed shows unexpected media, set the offending row's `status` to
  `rejected` or `archived` via the moderation path; RLS hides it immediately.

## Recovery / rollback (development only)
```sql
-- Remove all media (keeps the table):
delete from public.content_media;
-- Or drop the feature entirely (reverse of migration 9):
drop table if exists public.content_media;
drop type if exists public.media_provider;
```
Rollback is clean: migration 9 is additive and alters no existing table or policy.

## What this procedure never does
No production target, no RLS weakening, no client write grant, no automatic
approval, no secret in the repo. Media is published only by a human moderator,
one reviewed item at a time.
