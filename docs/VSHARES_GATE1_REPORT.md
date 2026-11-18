# VSHARES — Phase 10.5B-2: Gate 1 readiness report (apply migration 9 to DEV)

- **Date:** 2026-11-18 · This is an evidence-backed **GO / NO-GO** recommendation.
  No remote command was executed; no remote write, no publication, no RLS change.

## 1. Confirmed project reference & environment
- **Branch / commit:** `claude/gallant-mendel-xey567` @ `7283816`.
- **Dev project reference:** `apgchptregdpswiwmyua` (`vshare-development`), read
  from `.env.local` (no credentials exposed).
- **This session cannot reach the remote DB** (no Supabase CLI installed; direct
  Postgres to `db.apgchptregdpswiwmyua.supabase.co:5432` is not reachable). So the
  remote migration history must be confirmed by the owner with `supabase migration
  list` (read-only) — included in the execution plan.

## 2. Existing migration status
- **Local:** 9 migration files; migrations 1–8 are the previously-applied set,
  migration 9 (`20261118120000_content_media.sql`) is new and local only.
- **Migration 9 dependencies** (`content_items`, `app.can_read_content`,
  `app.is_staff`, `content_status`, `content_format`) all exist in migration 3
  (`20261114140000_catalogue.sql`) — **present and correctly ordered** before 9.
- **Remote:** expected 1–8 applied, 9 pending — **owner to confirm** via
  `supabase migration list`.

## 3. Migration-safety audit (no discrepancy found)
| Property | Finding |
|---|---|
| Constraints | FK `content_id`→`content_items` (cascade), provider-id format, https URL + length, channel/title/objective/licence lengths, `unique(provider,provider_id)`, `unique(original_url)`, `published_needs_review` (published ⇒ reviewed + embeddable). ✔ |
| Least-privilege grants | `select` only to `anon, authenticated`; **no write grant**. ✔ (verified on a fresh DB) |
| RLS policies | enabled; `select_published` (published AND parent readable), `select_staff`. ✔ |
| Published-parent visibility | `app.can_read_content(content_id)`. ✔ |
| Staff permissions | `app.is_staff()` select. ✔ |
| Server-write-only | no write policy + no write grant → only service role / definer writes. ✔ |
| Indexes | `content_idx`, `status_idx` (+ pkey and two unique indexes). ✔ |
| Idempotency / recovery | **Not idempotent** (no `if not exists`), **forward-only** (manual `drop` rollback). Standard across migrations 1–9; flagged, with recovery steps in the plan. |

## 4. Test results (local, this commit)
- **Fresh-DB preflight:** harness + **all 9 migrations** + post-migrate applied
  **clean**; migration 9 applied without error. Introspection on the fresh DB:
  RLS on, 2 select policies, SELECT-only grants to app roles, expected indexes.
- `npm run typecheck` **PASS** · `npm test` **PASS — 305 passed / 3 skipped** ·
  `npm run test:db` **PASS — 27 files, 457 assertions, 0 failed** (incl.
  `270_content_media.sql`).
- (E2E, build, hygiene and axe were green at this commit in Phase 10.5B-1.)

## 5. Exact pending action (owner)
Apply **one** migration to **dev only**:
```bash
supabase db push     # applies 20261118120000_content_media.sql
```
Preceded by `supabase migration list` (confirm 1–8 applied) and an explicit
owner approval checkpoint; followed by the read-only verification SQL. Full steps:
`VSHARES_GATE1_EXECUTION_PLAN.md`.

## 6. Risks & rollback limitations
- **Low risk:** additive migration, no change to existing tables/policies, proven
  to apply clean on a fresh DB; the app already tolerates the table being absent.
- **Partial-apply risk:** not idempotent — a mid-apply failure needs the recovery
  `drop type`/`drop table` before retrying.
- **No automatic down-migration:** rollback is manual (`drop table content_media;
  drop type media_provider;`), clean because nothing else depends on it.
- Applying the migration **publishes nothing**; media stays invisible until a
  human moderator publishes a reviewed row (separate, later-approved gate).

## Recommendation: **GO** (development only)
Migration 9 is **ready to apply to the dev project**: dependencies present and
ordered, safety audit clean, fresh-DB apply verified, full local suite green, and
a precise execution + recovery plan with owner stop points. The action is
additive, publishes nothing, and is cleanly reversible.

**This session stops here. No remote mutation has been or will be performed
without explicit owner execution of the plan.**
