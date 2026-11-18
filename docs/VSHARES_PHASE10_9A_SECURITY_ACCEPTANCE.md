# VSHARES — Phase 10.9A: Editorial Governance Security Acceptance

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- **Scope:** independently challenge the Phase 10.9 editorial governance
  implementation (migration 10) before authorising it on the hosted development
  database. Nothing was applied remotely; no persistence was activated.
- **Method:** empirical, against a real PostgreSQL 16 scratch database built from
  the harness + all ten migrations — catalog introspection, a role-by-role
  authorisation matrix, multi-session concurrency, and direct attack statements.
  Documentation assertions were not taken on trust.

## Verdict

**CONDITIONAL GO** — go once the owner applies the **hardened** migration (the
fixes below are committed on this branch) to the dev database and runs the
read-only preflight in §7. Five issues were found; four are fixed and verified,
one is an accepted, documented privileged-operator residual.

## Findings

| # | Severity | Issue | Status |
|---|---|---|---|
| F1 | **High** | No per-content serialization: two concurrent reviewers both chain from the same "latest" row, **forking the hash chain** so an honest ledger validates as **invalid**. | **Fixed** (advisory lock) · verified |
| F2 | **Medium** | Hash used `decided_at::text`, which is **time-zone dependent**: the same honest ledger validated `true` under UTC and `false` under other zones. | **Fixed** (epoch) · verified |
| F4 | **High** | `content_id` is `ON DELETE CASCADE` into an append-only table, so deleting content with decisions hit the trigger and raised — **breaking account erasure** (`delete_my_account`). | **Fixed** (cascade-aware trigger) · verified |
| F5 | **Medium** | `TRUNCATE` bypasses the append-only trigger; `service_role` (and owner) could wipe the whole ledger. | **Accepted residual** · documented |
| F3 | **Low** | `CREATE FUNCTION`'s default **PUBLIC EXECUTE** grant left all three functions callable by `anon` (the internal `is_staff()` check still blocked effect). | **Fixed** (revoke PUBLIC) · verified |
| F6 | residual | A DB superuser can disable the trigger, edit rows and recompute a consistent chain; no external anchoring. | Documented (unchanged) |

### F1 — concurrency chain fork (High)
Two reviewers approving the same content in overlapping `READ COMMITTED`
transactions both read the same latest row and chained from it. **Evidence:** a
20-way concurrent hammer on one content item, no lock → **5/5 trials produced an
invalid (forked) chain** (5–8 duplicate previous-links each). With the advisory
lock → **3/3 trials produced a clean linear chain, 20 distinct previous-links,
`editorial_ledger_valid = true`.**
**Fix:** `perform pg_advisory_xact_lock(hashtext('vshares.editorial_decision'), hashtext(p_content_id::text))`
before reading the previous row — serialises decisions per content only.
(Note: a session that deliberately runs `REPEATABLE READ`/`SERIALIZABLE` freezes
its snapshot and is out of this fix's scope; PostgREST/Supabase use `READ
COMMITTED`, where the lock is sufficient.)

### F2 — time-zone-dependent hash (Medium)
**Evidence:** an honest two-approval chain validated `t` under `UTC` but `f`
under `America/New_York` and `Asia/Kolkata`. **Fix:** hash
`extract(epoch from decided_at)` (an absolute instant) in both the record and the
verify function. **Re-verified** `true` under UTC, New York, Kolkata and
Kiritimati (+14).

### F4 — append-only cascade breaks erasure (High)
`delete_my_account` runs `delete from public.content_items where submitted_by = me
and status in ('draft','pending','rejected')`. **Evidence:** that exact DELETE on
a draft carrying decisions raised `editorial_decisions is append-only: DELETE is
not permitted` (cascade → trigger). **Fix:** the trigger now allows a DELETE only
when the parent `content_items` row is already gone — i.e. a cascade from content
deletion — and still blocks a direct delete (parent present). A controlled
experiment confirmed a BEFORE DELETE trigger sees the parent as **absent during a
cascade** and **present during a direct delete**; the trigger is SECURITY DEFINER
so that check is not subject to the caller's row visibility. **Re-verified:**
deleting the parent content cascades its decisions with no error; a direct
privileged delete while the parent exists is still refused.

### F5 — TRUNCATE bypass (Medium, accepted residual)
**Evidence:** owner `DELETE` was blocked by the trigger, but owner **and
`service_role` `TRUNCATE` wiped the ledger**. A TRUNCATE trigger cannot tell a
direct truncate from a cascade through `content_items`, so adding one broke the
test harness's legitimate `TRUNCATE ... CASCADE` reset (and would break any real
cascade). Revoking TRUNCATE from `service_role` is overridden by the platform's
`grant all ... to service_role`. **Decision:** accept as a privileged-operator
residual, consistent with the project's other audit tables and the superuser
case; the server never truncates the ledger, and wholesale deletion is far more
visible than a silent edit. External anchoring (out of scope) is the real defence
if ever required.

### F3 — default PUBLIC execute (Low)
**Evidence:** `proacl` showed `=X/postgres` (a PUBLIC grant) on all three
functions. **Fix:** `revoke execute ... from public` before granting to
`authenticated`. **Re-verified:** ACL now lists only `postgres` and
`authenticated`; `anon` gets `permission denied for function` (defence in depth —
`is_staff()` was and is the real guard).

## What was verified and held (no change needed)

- **SECURITY DEFINER + `search_path = ''`** on all three functions; every
  reference schema-qualified; `pgcrypto`/`digest` confirmed in `public`.
- **Authorisation matrix** (direct function calls): anonymous → refused; ordinary
  authenticated user → refused; reviewer → recorded; same reviewer re-approving a
  revision → refused; a second distinct reviewer → recorded and eligible. All via
  the server-set `app.current_user_id()`; no client identity path exists.
- **Revision integrity:** a revision from another content item → refused;
  high-impact needs two distinct approvers; a new current revision drops
  eligibility to false (prior approvals invalidated); eligibility is computed
  server-side only.
- **Append-only:** UPDATE and direct DELETE refused; a forced superuser tamper
  (trigger disabled, row edited) makes `editorial_ledger_valid` return false.
- **RLS:** staff-only SELECT; `authenticated` holds only SELECT; no write
  policy/grant; direct client INSERT refused.

## Related observation (out of scope, not blocking)
The project's other append-only audit tables (`audit_log`, identity audit) share
the same TRUNCATE residual and use `app.forbid_update_delete()`, which — unlike
the editorial guard — is not cascade-aware. Worth a separate hardening pass; a
follow-up task has been suggested. Not part of this phase.

## Remediation summary (all additive; migration 10 amended in place)
Migration 10 was **never applied to any database** (dev holds nine migrations), so
the fixes were made in the migration itself rather than shipping known-broken DDL
to be patched afterwards. Changes: advisory lock (F1); epoch-based hash in both
functions (F2); cascade-aware, SECURITY DEFINER append-only trigger (F4); revoke
PUBLIC execute (F3). The DB test `280_editorial_governance.sql` grew to **15
assertions** adding time-zone independence, direct-delete-blocked, and
cascade-delete-allowed; concurrency is proven in this report (multi-session, which
a single-transaction test cannot reproduce).

## §7 — Exact read-only preflight (run before applying migration 10 to dev)

All steps are read-only; none writes to the remote database.

1. **Confirm the dev history is at nine migrations** (so amending 10 is safe and
   10 has never been applied):
   ```bash
   supabase migration list --linked   # dev project apgchptregdpswiwmyua
   ```
   Expect the nine `2026111x…` migrations through `20261118120000_content_media`,
   and **no** `20261119120000_editorial_governance`.
2. **Dry-run the migration locally** against a fresh scratch DB (no remote writes):
   ```bash
   DATABASE_URL="postgres://postgres@127.0.0.1:5432/postgres" npm run test:db
   ```
   Expect `28/28 files, 472 assertions, 0 failed`.
3. **Inspect what will be created** (read-only), confirming: three SECURITY
   DEFINER functions with `search_path=""`; EXECUTE granted to `authenticated`
   only (no PUBLIC); RLS enabled with a single staff SELECT policy; the
   append-only trigger present; `content_id` FK `ON DELETE CASCADE`,
   `content_version_id` `ON DELETE RESTRICT`.
4. **Confirm the apply is forward-only and additive:** migration 10 creates a new
   enum, table, three functions and one trigger; it alters no existing object.
5. **Apply to dev only when satisfied,** exactly as migration 9 was applied, then
   re-run `supabase migration list --linked` and confirm `…editorial_governance`
   now appears. Grant moderator/admin to at least **two** distinct human
   reviewers. Do **not** activate the authenticated workbench form yet (separate
   change) and keep publication separate.

## Residual risks the owner is accepting at GO
- A DB superuser or `service_role` can bypass the ledger via trigger-disable or
  TRUNCATE (F5/F6) — mitigated operationally; external anchoring is the only
  cryptographic defence and is out of scope.
- `REPEATABLE READ`/`SERIALIZABLE` callers are not covered by the advisory lock
  (not used by the server).

## Restrictions honoured
No remote database writes · no remote migration push · no automatic approvals ·
no content publication · no production deployment · no merge · no secret exposure.

**STOP for owner review.**
