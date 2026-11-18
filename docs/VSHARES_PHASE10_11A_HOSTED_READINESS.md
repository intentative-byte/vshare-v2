# VSHARES — Phase 10.11A: Hosted Development Readiness & Editorial Acceptance Preflight

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567` · **Start commit:** `b472f2b`
- **Hosted dev project:** `vshare-development` (ref `apgchptregdpswiwmyua`)
- **This phase is strictly READ-ONLY.** No hosted writes, no accounts, no role
  changes, no seed execution, no publication, no deployment, no merge.

## Verdict: **NO-GO for the acceptance test yet** — three configuration items block it

The **application is ready** (code verified locally). The **hosted acceptance test
cannot run** because this session cannot authenticate to the hosted project and the
reviewer/seed state cannot be confirmed. Clear the three items in §3 and re-run this
preflight; it then becomes GO.

---

## Task 1 — Environment diagnostics

Values are never displayed; only presence is reported.

| Variable | Role | State | Required for editorial acceptance? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** client config (browser + server) | **set** (→ `apgchptregdpswiwmyua`) | yes (present) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL | set | yes (present) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Public** anon/publishable key — the whole app's DB client | **EMPTY** | **YES — this is the blocker** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privileged** server credential | **EMPTY** | **No** — not used by review |

**Public vs privileged, from the code:**
- `createRequestClient()` and `createPublicClient()` use **`url` + anon key** only
  (`requireDatabaseEnv`). The editorial reads and the `recordEditorialDecision`
  action all go through `createRequestClient` — anon key **plus the viewer's cookie
  session**, so RLS and the authenticated identity apply. **No service role in the
  review path.**
- `createPrivilegedClient()` (service role, `requireServiceRoleKey`) is used **only**
  inside named privileged operations (account deletion, export assembly, role
  grants, scheduled jobs) and "never to serve a page."
- `isDatabaseConfigured()` is true only when **both** the URL and the anon key are
  set. The admin layout calls `notFound()` when it is false — so **without the anon
  key, `/admin/editorial` 404s and no one can sign in.**

**Exact missing configuration:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the dev project's
"anon public" key, Settings → API). It is public by design and low-risk. **The
service-role key is not required for this phase and must not be requested or
exposed.**

## Task 2 — Hosted schema verification — **BLOCKED (no authenticated access)**

Hosted probes without a key (expected): `/rest/v1/content_items` → **401**,
`/rest/v1/editorial_decisions` → **401**, `/auth/v1/health` → **401**. No Supabase
CLI, no `SUPABASE_ACCESS_TOKEN`, no linked session in this environment. **I cannot
independently confirm the hosted schema at runtime.**

**Local reference (what migrations 1–11 produce — verified against real PostgreSQL 16
this phase):**
- 11 migrations apply cleanly.
- `record_editorial_decision`, `editorial_publication_eligible`,
  `editorial_ledger_valid`: all **SECURITY DEFINER**, `search_path=""`.
- EXECUTE granted to **`authenticated` only** (no PUBLIC) — the 10.9A hardening.
- `editorial_decisions`: **RLS enabled**; one policy `editorial_decisions_select_staff`
  (`SELECT` using `app.is_staff()`); table grants **`authenticated=r` (SELECT only)**,
  so it is server-write-only.
- Append-only triggers present: `editorial_decisions` (UPDATE+DELETE),
  `audit_log` (UPDATE+DELETE), `account_merges` (UPDATE guard + cascade-aware DELETE
  guard) — migrations 10 & 11.

The owner states all 11 migrations are applied on hosted dev. That is **consistent
with** this local reference but **not independently runtime-verified** here. Re-run
this check (read-only) once the anon key exists.

## Task 3 — Reviewer readiness — **BLOCKED**

Cannot read hosted `user_roles` without a key. **Requirement for the two-person
rule:** at least **two distinct accounts** each holding `moderator` or `admin`
(staff is `has_role('moderator') OR has_role('admin')`, read from `user_roles`). The
same account cannot satisfy both high-impact approvals (DB-enforced). **No accounts
were created and no roles elevated** (and must not be). This must be confirmed
read-only once access exists.

## Task 4 — Originals inventory — **BLOCKED on hosted; local reference established**

**Critical distinction:** the ten Originals come from
`supabase/seed/020_cards_batch_1.sql`, which is a **seed file, NOT a migration**.
"All 11 migrations applied" does **not** imply the seed ran. So the Originals'
presence on hosted dev is **unknown** and must be checked read-only.

Local reference (seed applied to a scratch DB this phase):
- **10** `content_items`, all **`draft`**.
- **3 high-impact, 7 standard.**
- **10** `content_versions`; every item has a `current_version_id` (the immutable
  revision the workbench binds decisions to).
- **0** link-checked (so none is publishable — the publish gate holds).
- **0** `editorial_decisions` (clean ledger).

If the hosted board shows "No content awaiting review," the seed has not been applied
there (an owner-authorised, separate step — not done in this phase).

## Task 5 — Application verification — **CONFIRMED (code + local tests)**

- **Authenticated route:** `/admin/editorial` is a server component gated by the
  admin layout — `isDatabaseConfigured()` false → `notFound()`; non-staff viewer →
  `notFound()`. Identity shown from `readMyProfile()`; no typed identity.
- **Server-action wiring:** the workbench calls `content.recordEditorialDecision`
  (`access: "moderator"`) → `record_editorial_decision` through `createRequestClient`
  (anon key + session, RLS). Rationale required (Zod min 10); identity/timestamp
  DB-set; eligibility read from `editorial_publication_eligible` (never the browser).
- **Audit-history reads:** `listEditorialReviewItems`, `listEditorialDecisions`,
  `getEditorialPublicationEligible`, `getEditorialLedgerValid` — all via
  `createRequestClient` (RLS staff-only).
- **Error handling:** reads return `[]` on error / missing schema (no crash); the
  action maps duplicate-approval → `CONFLICT`, non-staff → `FORBIDDEN`, else
  `UNAVAILABLE`; the UI claims no persistence it did not get.
- **Dev previews gone in production:** e2e asserts `/admin/editorial`,
  `/dev/editorial` and `/dev/editorial-auth` all answer **404** (production build).

**Local regression this phase (all green):** typecheck, lint, hygiene (399 files),
unit **319 passed / 4 skipped**, **test:db 29 files / 478 assertions, 0 failed**,
e2e **94 passed / 72 skipped** (incl. editorial 404 gating), build.

## Task 6 — Acceptance test plan (for when the three items are cleared)

Run against hosted dev, signed in through the real auth service. **W = requires an
owner-authorised hosted write.**

| # | Test | Expected | Writes? |
|---|---|---|---|
| 1 | Reviewer A signs in, opens `/admin/editorial` | Board renders; identity = A; staff role shown | no |
| 2 | Reviewer B signs in, opens `/admin/editorial` | Board renders; identity = B | no |
| 3 | Ordinary (non-staff) account opens `/admin/editorial` | **404** | no |
| 4 | Anonymous opens `/admin/editorial` | **404** | no |
| 5 | Reviewer A records **Request revision** on a standard draft (rationale ≥10) | Decision persists; appears in ledger with A's id + server time, bound to current revision | **W** |
| 6 | Reviewer A records **Approve** on a **standard** draft | Decision persists; `publication_eligible` → true (1 reviewer) | **W** |
| 7 | Reviewer A **Approve** again on the same revision | **Refused** ("already approved this revision") | **W** (attempt) |
| 8 | Reviewer A **Approve** a **high-impact** draft | Persists; eligibility **false** (needs 2) | **W** |
| 9 | Reviewer B **Approve** the **same high-impact revision** | Persists; eligibility **true** (2 distinct) | **W** |
| 10 | Owner adds a **new revision** to that high-impact card, reviewers reopen | Prior approvals shown **superseded**; eligibility back to **false** | **W** (new version) |
| 11 | Inspect audit history | Reviewer id, decision, rationale, server timestamp, revision, per-revision status all correct; `editorial_ledger_valid` true | no |
| 12 | Confirm **publication remains locked** | No publish happens from any decision; cards stay `draft`; publishing still only via `moderate_content` and still blocked by unchecked links | no |

Tests 1–4, 11, 12 are **read-only**. Tests 5–10 are the **owner-authorised writes**
(this phase did none). Keep them on hosted **development** only.

## Task 7 — Delivery

1. **Readiness:** app code READY; hosted runtime NOT verifiable here.
2. **Confirmed:** env var roles & the single missing var; local schema reference
   (migrations 1–11 objects/grants/RLS/triggers); seed reference (10 drafts, 3
   high-impact); application wiring, error handling and dev-route 404s; full local
   regression green. **Blocked:** hosted schema runtime check, reviewer existence,
   hosted Originals inventory — all on the missing anon key.
3. **Exact missing configuration:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dev project
   anon/public key). Service-role key **not** needed.
4. **Reviewer readiness:** **unknown/blocked** — needs ≥2 distinct moderator/admin
   accounts confirmed (read-only) once access exists.
5. **Originals inventory:** **unknown/blocked** — the seed is separate from
   migrations; confirm 10 drafts exist on hosted, else the owner applies the seed
   (separately authorised).
6. **Safe activation instructions (owner, in order):**
   1. Paste the dev **anon public** key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      (Settings → API). Do **not** add the service-role key.
   2. Grant `moderator`/`admin` to **two distinct** reviewer accounts on dev.
   3. Confirm the Originals seed is present on dev (else apply
      `supabase/seed/020_cards_batch_1.sql` — a separate, owner-authorised step).
   4. Re-run this preflight (read-only): hosted schema + reviewers + Originals should
      all move from BLOCKED to confirmed.
   5. Then run the §6 acceptance plan on dev; writes 5–10 are owner-authorised and
      development-only.
7. **GO / NO-GO:** **NO-GO** for the acceptance test until items 1–3 above are done.
   The application itself is **GO** (verified). No code defects block activation.

## Restrictions honoured
No hosted writes · no new accounts · no role elevation · no remote seed execution ·
no publication · no deployment · no merge · no credential exposure.

**STOP for owner review.**
