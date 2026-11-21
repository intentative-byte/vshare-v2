## Current state

- **Phase:** 11 (MVP-level hardening), in progress. Milestones 1 to 7 are built and tested; Milestone 8 is **in progress and incomplete** because live verification is blocked.
- **Branch:** `claude/gallant-mendel-xey567`. Nothing merged to `main`, nothing deployed.
- **Headline:** the application is internally complete and passes everything that can run without a live service, but **it is not production-ready.** 72 authentication-dependent checks have never run, full erasure is unverified end to end, and no catalogue card can be published until its links are checked. `VSHARES_RELEASE_DASHBOARD.md` is the single honest view.
- **Verified (latest, commit `95ba9f7`):** 200 unit tests, 450 database assertions over 26 files against real PostgreSQL 16, 90 end-to-end passing and 72 skipped (live-service, blocked on the anon key), concurrency test green, 25 routes built, 0 production advisories. `docs/VSHARES_PHASE9_VERIFICATION.md` holds the Phase 9 evidence.
- **Built this milestone:** the admin catalogue and taxonomy interface (`/admin/taxonomy`, `/admin/cards/*`, `/admin/audit`) — the one feature release-blocker from M3. Guarded in three layers and proven by DB tests that call the functions as the wrong role.
- **Executed this milestone:** a real backup-and-restore drill (pg_dump/pg_restore), a security review (3 low/info findings, all fixed), and front-end performance measurement (~224 KB first-load JS, within budget).
- **Blocked on a live service (D17):** the 72 live checks, end-to-end erasure, the 60-second first-win benchmark, Core Web Vitals on real journeys, a manual screen-reader pass.
- **Open (owner):** source-link checking and the launch catalogue; privacy notice, terms and a DPIA.
- **Deliberately not enabled:** the analytics rollup and guest dry-run schedules (no platform chosen); the destructive guest purge (not approved).

## Decisions required

| # | Decision | Recommended default | Blocks |
|---|---|---|---|
| D17 | **72 live-service tests are now blocked on a database.** `VSHARES_SUPABASE_SETUP.md` has the exact steps; it costs nothing and needs only the publishable key | Create a free development project and send the project URL and anon key | Verification of seven milestones' worth of journeys, plus the M8 admin interface |
| D15 | **Review the first 10 value cards** in `VSHARES_CATALOGUE_BATCH_1.md`, checking each summary against the live page — I could not open any of them | Correct the house style now, before the remaining ninety | The rest of the catalogue |
| D16 | **Network access is needed to check source links.** No card can be published without it; the database enforces this | Run `npm run check:links` where the web is reachable, or allow the source hosts here | Publishing anything |
| D14 | **An auth service is needed to finish verifying Milestone 2.** Either enable a container runtime in this environment for the local stack, or create a Supabase project (the free tier is enough) and share its URL and anon key — never the service-role key | Create a project; it costs nothing and unblocks live verification | Completing Milestone 2 verification |
| D11 | Review the Milestone 1 reference screens (`docs/evidence/milestone-1/`) and confirm the visual direction, or say what to change | Confirm | M2 polish |
| D12 | Confirm the font pairing: Sora for headings, Inter for body, both self-hosted | Confirm | M2 |
| D13 | Google sign-in needs an OAuth client created in your Google Cloud account (free). Shall I proceed with magic link only in M2 and add Google when the client exists? | Magic link first, Google as soon as the client exists | M2 |
| D4 | Does a hosted Supabase project or a live Render service exist? If yes, share the project reference / service URL (not keys) so it can be inventoried | — | M8 planning; nothing before |
| D5 | Launch catalogue: who curates it and how big? | I draft ~100 value cards across 8 topics from real, link-checked resources, flagged AI-assisted; you review before publication | M3 |
| D6 | Initial topic list for the MVP | Technology & AI · Career · Entrepreneurship · Personal finance · Productivity · Communication · Health & wellbeing · Learning how to learn | M3 |
| D7 | Analytics for visitors before consent: identifier-free aggregate counts only, or pseudonymous first-party measurement under legitimate interests | Identifier-free until consent | M7 |
| D8 | PR disposition: close #1, #3, #4, #5 with a link to the report, keep branches | Approve | — |
| D9 | Validation targets in spec §B1 | Accept as proposed | M7 |
| D10 | Historical brand assets: if a logo or screenshots of the earlier version exist, supply them as reference; none are in the repository | Otherwise proceed with the specified black / gold / silver / blue system | M1 reference screens |

## Log

### 2026-11-21 — Phase 10.13 T3+T5 (batch-2 generation + local DB bridge verification)

Local only; no hosted write, no publication, no RLS/role change. Honesty kept
strict — nothing is verified, approved or publishable.

- **T3 — batch-2 draft candidates** (`src/factory/originals/batch2.ts`): 20
  candidates across the real taxonomy, run through `runPipeline` + `classifyDuplicate`
  against the seeded batch-1 catalogue. **No supporting quotes, no live retrieval**,
  so the factory left every candidate UNVERIFIED. Honest factory output:
  **0 verified**, evidence 14 `not_verified` / 6 `cited_pending_verification`;
  rubric **6 queue / 14 reject** (reject = unsupported claims — the gate refusing,
  not us lowering the bar); **0 exact duplicates, 0 near-duplicates** (all unique);
  4 high-impact (Personal Finance). Report:
  `docs/VSHARES_ORIGINALS_BATCH_2.md` + `docs/samples/originals-batch-2-candidates.json`
  (regenerated by the integration test). "queue" ≠ verified ≠ approved.
- **T5 — local DB bridge verification** (`supabase/tests/cases/300_factory_bridge_draft_only.sql`,
  10 assertions): a bridged card (exact `create_card` shape) enters as **draft,
  link-unchecked, unpublished**; non-moderator refused; missing topic refused;
  duplicate `source_url` refused; **approving an unchecked-link card refused**;
  **author cannot approve their own high-impact card**; nothing published. RLS and
  permissions unchanged.
- Verified local: typecheck, lint, **366 unit (4 skip; +9 batch-2 integration)**,
  **30 DB files / 488 assertions**, build, hygiene. Committed locally; **not
  pushed** (awaits separate approval). D-118.
- Outstanding: T4 (attach real evidence / live retrieval, re-grade), T6/T7
  (workbench wiring + Playwright), hosted acceptance (anon key + reviewers + admin
  login) still blocked.

### 2026-11-21 — Phase 10.13 T1+T2 (dedup baseline + factory→catalogue bridge)

Implemented the first two Phase 10.13 tasks (plan: `VSHARES_PHASE10_13_PLAN.md`).
Local only; no hosted write, no publication, no RLS/role/quorum change.

- **T1 — dedup baseline:** added `classifyDuplicate` (+ `normalizeTitle`,
  `toCatalogueEntry`) to `src/factory/dedup.ts`. Distinguishes a CERTAIN exact-URL
  collision (safe to skip; the DB's `source_url` UNIQUE would reject it anyway)
  from an UNCERTAIN near-match (identical normalised title or high title
  similarity on a different URL) which is **flagged for human review, never
  auto-discarded**. Pure/deterministic; exported via the factory index.
- **T2 — factory→catalogue bridge:** `src/modules/content/factory-bridge.ts`
  `toCreateCardInput(card, topicId)` — a pure, typed `FactoryCard → createCardInput`
  conversion validated against the **same Zod schema** the moderator-only
  `create_card` uses. It **cannot** set a publication status, link-check or
  approval (no such field exists on the input), so a factory card can only ever
  enter as a draft. Preserves provenance, evidence status, objective, high-impact
  flag and quality on the result; blocks on a rubric "reject" / invalid-or-missing
  fields / unresolved topic UUID; warns (non-blocking) on unverified evidence or a
  "revise" verdict. Placed in the content module (lint boundary: cross-module
  imports go through index.ts) with a type-only `@/factory/types` import.
- Tests: `tests/unit/factory/dedup-classify.test.ts` (10) +
  `tests/unit/content/factory-bridge.test.ts` (12) — valid/invalid/incomplete,
  advisory warnings, provenance, and "never sets publication". Full gate green:
  typecheck, lint, **357 unit (4 skip)**, **29 DB files / 478 assertions**, build,
  hygiene. Committed locally; **not pushed** (awaits separate approval). D-117.

### 2026-11-21 — Phase 10.12 (editorial dashboard hardening)

Hardened the authenticated editorial dashboard; governance/security/quality rules
preserved. **No publication, no RLS change, no hosted writes, committed locally but
not pushed (awaits owner approval).**

- New pure module `src/components/editorial/review-state.ts` — `deriveReviewState`,
  `reviewerExplanation`, `DECISION_GUIDANCE`, `matchesFilters` (no React/DB/I/O),
  with 16 unit tests.
- `/admin/editorial` workbench now shows an explicit review-state badge + reason
  per item, a filter bar (review status / impact / category / "awaiting my
  review"), per-decision guidance, plain-language reviewer explanations in the
  audit ledger, and a `role="alert"` error region with code-based messages
  (session expired, forbidden, rate-limited, duplicate/conflict, not-found,
  network) plus a loading state — never claiming a write that did not happen.
- `/dev/editorial-auth` preview expanded to two items (high-impact pending-second-
  review + standard pending-review) so filters/states render; axe 0 at 412/1280.
- Unchanged: the three-layer access gate, the server action, the governance SQL,
  RLS, append-only audit, and the two-reviewer quorum. Publication still disabled.
- Verified local: typecheck, lint, **335 unit (4 skip)**, **29 DB files / 478
  assertions**, 94 e2e (72 skip), build, hygiene 400, axe 0. **Hosted acceptance
  NOT claimed** — this session has no anon key (REST 401); admin browser session
  still blocked on the magic-link rate limit. Report:
  `docs/VSHARES_PHASE10_12_REPORT.md`; decision D-116.

### 2026-11-18 — Phase 10.11A (hosted readiness & acceptance preflight, read-only)

Read-only preflight for the first authenticated editorial acceptance test on hosted
dev. **No hosted writes, no accounts, no roles, no seed, no publication.**

- **Env diagnostics:** the one missing variable is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (public client key). `SUPABASE_SERVICE_ROLE_KEY` is also empty but is **not**
  needed for review (service role is only for named privileged ops, never the review
  path). Without the anon key `isDatabaseConfigured()` is false, so `/admin/editorial`
  404s and no one can sign in.
- **Hosted schema / reviewers / Originals:** **BLOCKED** — hosted REST/auth return
  401 (no key), no Supabase CLI/token. Verified the equivalents against **local
  PostgreSQL**: migrations 1–11 produce the correct governance schema (3 SECURITY
  DEFINER funcs search_path="", authenticated-only EXECUTE, RLS staff-select,
  SELECT-only grant, append-only triggers on editorial_decisions/audit_log/
  account_merges); the seed yields 10 draft Originals (3 high-impact, 7 standard),
  each with an immutable current revision, 0 link-checked, 0 decisions. **Critical:
  the Originals seed is NOT a migration** — "11 migrations applied" does not imply the
  seed ran, so hosted Originals presence is unknown.
- **Application:** CONFIRMED (code + local) — route gating, action wiring via
  `createRequestClient` (anon key + session, no service role), RLS audit reads, error
  handling, and dev-route 404s. Full local regression green (typecheck, lint, hygiene
  399, 319 unit, 29 DB files / 478 assertions, 94 e2e, build).
- **Verdict: NO-GO** for the acceptance test until (1) anon key set, (2) ≥2 distinct
  moderator/admin reviewers granted, (3) Originals seed confirmed on dev. The app
  itself is GO. Acceptance plan + safe activation steps:
  `docs/VSHARES_PHASE10_11A_HOSTED_READINESS.md`. Decision D-115.

### 2026-11-18 — Phase 10.10 (authenticated editorial workbench activation)

Turned the browser-only prototype into an authenticated, database-backed review
surface. **No publication, no remote writes, no merge.**

- `/admin/editorial` is now a server component (staff-gated) that reads real
  `content_items` + immutable `content_versions` and the real `editorial_decisions`
  ledger through RLS, shows the signed-in reviewer's identity, and records
  decisions (approve/request_revision/reject/escalate, rationale required) via the
  authenticated action `content.recordEditorialDecision`. Identity/timestamps are
  DB-set; eligibility is read from the DB (`editorial_publication_eligible`), never
  computed in the browser; nothing publishes. Immutable revision shown and bound;
  superseded approvals flagged; DB audit history rendered; honest empty/evidence
  states.
- New repository reads (`listEditorialReviewItems`, `listEditorialDecisions`) via
  the RLS request client; new client component
  `authenticated-editorial-workbench.tsx`. Manually-typed reviewer identity removed
  from the authoritative path.
- `/dev/editorial` stays the labelled localStorage simulation; new
  `/dev/editorial-auth` is an accessibility preview of the authenticated component
  (preview mode, records nothing). Both dev routes 404 in prod (e2e asserts it).
- **Blocker — hosted-dev runtime verification not possible:** this session has the
  dev URL but **no anon key** (REST/auth → 401), so no reviewer can sign in here.
  Reported honestly; no identity invented, no auth bypassed. Needs: anon key + ≥2
  moderator/admin reviewer accounts + the card seed present on dev.
- Verified local: typecheck, lint, 319 unit, **29 DB files / 478 assertions**,
  94 e2e (72 skip), build, hygiene (394), **axe 0** on `/dev/editorial-auth`
  (412/1280). Report: `docs/VSHARES_PHASE10_10_REPORT.md`; decision D-114;
  screenshots in `docs/samples/`.

### 2026-11-18 — Audit-table append-only hardening (10.9A follow-up)

Acted on the 10.9A observation that the project's other append-only audit tables
shared a direct-DELETE gap. Verified against real PostgreSQL and fixed additively
(migration `20261120120000`). **Local only; nothing applied remotely.**

- **Finding:** `audit_log` and `account_merges` triggers fired on UPDATE only, so
  `service_role` (holds a DELETE grant) could delete rows directly — proven: a
  service-role `DELETE` wiped an `audit_log` row (1→0) and an `account_merges` row.
- **No F4-class conflict elsewhere:** editorial_decisions was the only table that
  paired `ON DELETE CASCADE` with a delete-blocking trigger; `account_merges`
  (cascade target / set-null guest) and `audit_log` (set-null actor) were already
  erasure-safe.
- **Fix:** `audit_log` now blocks DELETE outright (no legitimate delete path —
  actor is nulled, never deleted). `account_merges` keeps its UPDATE guard
  (nulling `guest_user_id` on guest erasure) and adds a cascade-aware DELETE guard
  — direct delete blocked while the target exists, cascade allowed when the target
  is erased. Mirrors the editorial ledger.
- **TRUNCATE** stays a documented privileged-operator residual across all audit
  tables (a TRUNCATE trigger can't tell a cascade from a direct truncate).
  Documented in `docs/VSHARES_SECURITY.md` (T16 + note). Decision D-113.
- New test `290_audit_append_only_hardening.sql` (6 assertions; incl.
  service-role direct-delete blocked, guest-erasure set-null preserved, target
  cascade allowed). Gate green: **29 DB files / 478 assertions**, typecheck, lint,
  hygiene (392); `070`/`140`/`190` erasure tests still pass.

### 2026-11-18 — Phase 10.9A (editorial governance security acceptance)

Independently red-teamed migration 10 against real PostgreSQL 16 before any remote
apply. Found five issues; fixed four additively in the (still-unapplied) migration
and accepted one documented residual. **Nothing applied remotely; nothing
activated.**

- **F1 (High)** concurrency chain fork — two concurrent reviewers chained from the
  same row, so an honest ledger validated as invalid. Fixed with a per-content
  `pg_advisory_xact_lock`. Proven multi-session: no-lock **5/5 trials forked**,
  with-lock **3/3 clean linear chains** (READ COMMITTED, 20-way hammer).
- **F2 (Medium)** `decided_at::text` made the hash timezone-dependent (valid under
  UTC, invalid under other zones). Fixed with `extract(epoch …)`; re-verified
  valid under UTC/New York/Kolkata/Kiritimati.
- **F4 (High)** `ON DELETE CASCADE` into the append-only ledger broke
  `delete_my_account` (GDPR erasure) — the exact erasure DELETE raised. Fixed with
  a cascade-aware SECURITY DEFINER trigger (allows a delete only when the parent
  content is already gone; still blocks direct deletes).
- **F3 (Low)** default PUBLIC EXECUTE on the three functions. Fixed with
  `revoke … from public`; anon now gets permission denied.
- **F5 (Medium, accepted residual)** TRUNCATE by service_role/owner bypasses
  append-only; a TRUNCATE trigger can't distinguish a cascade and would break the
  harness, so documented as a privileged-operator residual (as the other audit
  tables are). **F6** superuser tamper unchanged/documented.
- Verified and held: SECURITY DEFINER/search_path, the full authorisation matrix,
  revision integrity/invalidation, append-only UPDATE/DELETE, forced-tamper
  detection, RLS.
- DB test `280` → **15 assertions** (added timezone-independence, direct-delete
  blocked, cascade-delete allowed). Full gate green: typecheck, lint, **28 DB
  files / 472 assertions**, 319 unit, 94 e2e, build, hygiene (391), audit 0.
- Verdict **CONDITIONAL GO** with a read-only preflight. Evidence + preflight:
  `docs/VSHARES_PHASE10_9A_SECURITY_ACCEPTANCE.md`. Decision D-112.

### 2026-11-18 — Phase 10.9 (editorial governance, identity & audit)

Prepared the Editorial Review Workbench for authenticated human decisions,
independent second reviews and a tamper-evident decision history — **built and
database-tested locally, nothing applied remotely, nothing activated, nothing
published.**

- Migration 10 `20261119120000_editorial_governance.sql` (additive): new
  `editorial_decisions` table, server-write-only (staff `select` via RLS, no
  write policy/grant, append-only trigger blocking UPDATE/DELETE), bound to an
  immutable `content_versions` revision. Three SECURITY DEFINER functions
  (`search_path = ''`): `record_editorial_decision` (reviewer from
  `app.current_user_id()`, time from `now()`, eligibility computed server-side —
  none client-supplied; two **distinct** reviewers for high-impact; same account
  cannot approve twice), `editorial_publication_eligible` (current-revision
  quorum; a new revision auto-invalidates prior approvals), `editorial_ledger_valid`
  (recomputes the `sha256(prev ‖ fields)` chain). A monotonic `seq` orders the
  chain (so a shared transaction `now()` and random uuids cannot).
- DB test `280_editorial_governance.sql` — 12 assertions incl. **forced-tamper
  detection** (disable trigger as superuser, mutate, re-enable → chain invalid).
- Server action `content.recordEditorialDecision` (`access: "moderator"`, full
  pipeline) with repository calls; no client identity/timestamp/eligibility;
  publication stays separate (`moderate_content`).
- Workbench relabelled: local decisions are a browser-only **simulation** — not
  authenticated, not persisted, not authoritative; authenticated path named as
  built but **not yet activated**.
- Design + honest tamper-evidence limitations (privileged superuser can still
  rewrite history; no external anchoring): `docs/VSHARES_EDITORIAL_GOVERNANCE.md`
  (incl. owner-controlled activation procedure). Decision D-111.
- Full gate green: typecheck, lint, **28 DB files / 469 assertions**, 319 unit
  (4 gated-skip), 94 e2e (72 skip), build, hygiene (387 files), prod audit 0,
  axe 0 on `/dev/editorial`. Evidence: `docs/VSHARES_PHASE10_9_REPORT.md`.

### 2026-11-17 — Adaptive learning: session-end feedback (L1–L3)

Built the session-end feedback loop, additively, after auditing the learner model (the two audit docs). No existing column, policy or test was changed except the one assertion recording the active ranking-config version.

- Migration `20261117120000_adaptive_learning.sql`: a confidence count on `user_topics`, a `user_format_affinity` table, a `session_reviews` table, `record_session_review`, and ranking config v2 (formatFit + confidence). All owner-only, server-write-only, in the export, removed on deletion.
- Ranker v2: a format-fit signal (0 without a preference; a small bounded boost with one) and confidence scaling of learned affinity, both optional so v1 behaviour is reproduced exactly and no existing ranker test is weakened.
- A skippable end-of-session review on the session-complete screen — never more cards.
- 8 new ranker unit tests, 25 new database assertions covering all eight owner acceptance tests, including that a review cannot publish or admit content and that skipping loses no progress.
- 200 unit, 420 DB assertions, 90 e2e passing. Production off, PR #8 untouched.


### 2026-11-15 — Live Integration stage: connection readiness

Still no hosted Supabase project or container runtime here, so the 72 live
journeys stay blocked and are reported as blocked. Did the work that does not
need the HTTP services:

- Prepared the complete development-connection guide (`VSHARES_SUPABASE_SETUP.md`)
  against the directive's 11-point checklist: project creation, env vars, secure
  credentials, migrations (CLI and no-CLI routes), auth settings, magic-link
  redirects, Google OAuth prerequisites, catalogue seeding, staff bootstrap,
  troubleshooting.
- Added two turnkey scripts: `apply:project` (applies migrations + seeds to a
  project, refuses a local test DB, never applies the harness) and
  `bootstrap:staff` (grants the first admin by email).
- **Proved the app applies and runs against a Supabase-shaped database** — real
  `auth.users`, the three roles, no harness. All 7 migrations and both seeds
  apply; the signup trigger creates a profile and preferences; cards load as
  drafts; grants reach `authenticated`/`anon`; RLS reads work with request
  claims. The schema layer is ready; only the HTTP service layer is unreachable.
- Found and fixed two bugs in `bootstrap-staff.mjs` by running it, not reviewing
  it (psql variable interpolation; exit code on an unknown email).
- Updated the release dashboard (§1a) and the test report.

Connection is now turnkey the moment the owner creates a project. That one
action (two public values) unblocks the bulk of the remaining verification.


### 2026-11-15 — Milestone 8: release hardening and MVP verification

The honest summary first: **this milestone is incomplete.** Its acceptance standard is a real user completing real journeys against real services, and no live service exists here, so the bulk of verification is blocked and reported as blocked. What could be done independently was done fully.

Built:
- **The admin catalogue and taxonomy interface** — the one feature release-blocker outstanding since M3. `/admin/taxonomy` (categories and topics: create, edit, archive, restore), `/admin/cards/new`, `/admin/cards/[id]` (edit as a new version, version history, review, read-only link status, moderation trail), `/admin/audit`. Three new form primitives (TextArea, SelectField). Guarded in three layers; taxonomy is admin-only, cards are moderator-and-up, and the database draws both lines.

Executed (not just documented):
- **A backup-and-restore drill** against real PostgreSQL: dump, drop, restore, verify. 9 of 9 checks, including that row-level security and all 33 policies survived and a later migration still applies on the restore. `scripts/backup-restore-drill.mjs`, `npm run drill:backup`.
- **A security review** of all 14 directive items, with an independent pass over the new admin surface. Three findings, all low or informational, all fixed: a misleading unused authorship field removed, a rate limit added to the two unrate-limited card writes, and the admin id parameter confirmed safe.
- **Performance measurement**: ~224 KB first-load JavaScript (within the 300 KB budget), shell routes ~100–170 ms. Found and explained a 7-second `/explore` first paint — the placeholder DB host timing out, not a production number.

Documented:
- `VSHARES_RELEASE_DASHBOARD.md` (the single readiness view, every blocker visible), `VSHARES_SECURITY_REVIEW.md`, `VSHARES_BACKUP_RESTORE.md`, `VSHARES_PERFORMANCE_ACCESSIBILITY.md`. Updated the register (admin interface now implemented), live-verification checklist (admin journeys added; count 62 → 72), roadmap, decisions (D-086 to D-092).

Found and fixed:
- A privacy-shaped finding in my own new code: a `submittedByMe` field on the admin card read, hardcoded false and unused — removed before it could be mistaken for a control.
- Two card-write actions without rate limits — added one.
- Two self-inflicted bugs while building the drill (a function check pointing at a held-back migration; a raw-insert seed hitting a constraint) — both fixed by making the drill more faithful to the real database.

Blocked, and reported as blocked (not simulated):
- The 72 live-service checks, full end-to-end erasure, the 60-second first-win benchmark, Core Web Vitals on real content, a manual screen-reader pass. All need a live auth service (D17) or a person.

Open for the owner:
- D17 (a free dev project) is the single action that unblocks most verification.
- Source-link checking and the launch catalogue; privacy notice, terms and a DPIA.

**Recommendation: do not release.** Milestone 8 stays open until the live verification is done and the catalogue is published.


### 2026-11-14 — Milestone 7: essential analytics and product intelligence

Done:
- **Changed how measurement works.** Milestone 6 counted what the browser reported. Anything decisions rest on is now *derived*: `rollup_day()` recomputes a day from `content_interactions`, `feed_sessions` and the catalogue, so replaying an event cannot move it. Reported events survive in their own rows, labelled, for the things only a browser can see.
- Migration 6: the rollup, reconciliation, the suppression threshold, `learner_milestones`, the overview and breakdown views, and the staff-only first-win timing view.
- The metrics dictionary (`VSHARES_METRICS_DICTIONARY.md`) and the value framework (`VSHARES_VALUE_FRAMEWORK.md`): four tiers never added together, two of them measured and two deliberately empty.
- `/admin/metrics`: headline tiles, daily completions, sessions, returning learners, most completed topics, contributions and moderation — every figure printed with what it does not mean, every chart paired with a table of the same numbers.
- Chart colours chosen by measuring: the interface gold and blue sit outside the lightness band for a dark chart surface, so two new tokens were validated against all six checks before use.
- `VSHARES_LIVE_VERIFICATION.md`: all 62 skipped checks in one list, with what each needs and the order to clear them.
- `VSHARES_SCHEDULED_JOBS.md`: the configuration for the nightly rollup and the approved guest dry run. Neither is switched on, because no deployment platform is chosen; the destructive purge is documented and explicitly not approved.
- 76 new database assertions (381 total), 20 new unit tests (177 total), 16 new end-to-end checks.
- Recorded the missing admin catalogue and taxonomy interface as a release blocker in the register rather than letting it sit as a quiet "not started" row.

Found and fixed:
- **A privacy leak I had just introduced.** The first-win timing and the conversion date were columns on `profiles`, which has a policy making a public profile readable by anyone and another letting any moderator read every row. Row-level security has no column granularity, so both would have been readable by the world and by staff. Caught by writing the test that asserted the opposite and watching it fail. They live in `learner_milestones` now, readable only by the person.
- **A 6.6× performance regression.** A day's rollup took 702 ms. Not a missing index: `app.day_of()` carried a `search_path` setting, and a SQL function with a SET clause cannot be inlined, so it ran per row and the index went unused. 95 ms against 6 ms on 80,000 rows. Removing it took the rollup to 106 ms.
- **Three indexes that did nothing.** Written for the rollup, then measured: 73–77 ms with them, 72–77 ms without. Removed.
- **The Milestone 5 funnel view mixed a browser's claim with a measurement.** One name now exists in both forms, and the view took whichever row was larger — a browser claiming 9,999 seconds beat a measured 60. The superseded view is pinned to reported rows now, with three assertions holding the two apart.

Corrected a plan rather than following it:
- The roadmap said rollups would be "reconciled against raw events". They cannot be, and saying so would have been misleading: raw events exist only for people who consented, so the two can never agree. Reconciliation is against the product tables instead, which is exact. The consented count is reported alongside to show the gap.

Not done / limitations:
- Nothing is scheduled. The dashboard will have no figures until a rollup runs, and it says so rather than showing zeros.
- Learning journeys across PATH, LEARN and EXPLORE are measured only as surfaces on reported events; the derived metrics are not yet split by surface.
- Guest conversion is a ratio of two counts in the same window, not a cohort. Stated wherever it appears.
- 62 live checks remain skipped, 3 of which also need a privileged client.


### 2026-11-14 — Milestone 6: submissions, sharing, data rights and account lifecycle

Done:
- Produced a personal-data inventory by querying the live schema for every reference to a user, then reading each table (`VSHARES_DATA_INVENTORY.md`). It found a defect the data model document did not show: `account_merges.guest_user_id` held a user identifier with no foreign key, so deleting that guest would have orphaned it for ever. Fixed, with an assertion that no orphan remains.
- Migration 5 (`20261114170000_data_rights.sql`): consent events, `export_my_data()`, `delete_my_account()`, `app.last_authenticated_at()`, `app.purge_stale_guests()` and `resubmit_content()`.
- Submission: `/you/submit`, validated and rate limited. A submission enters as a draft and takes the same review, high-impact and link-check rules as anything we write. There is no parameter that could publish one.
- `/you/submissions`: status, moderator feedback where given, and a correction form that resubmits once as a new version, keeping the moderation history.
- Reporting and sharing on the card page: a share sheet with a clipboard fallback, and a report form that refuses a duplicate. An unpublished slug answers 404 to everyone, its own submitter included.
- `/you/data`: a JSON export of the thirteen categories in the inventory, and account deletion requiring a typed confirmation and a sign-in within the last fifteen minutes.
- The guest lifecycle policy (`VSHARES_GUEST_LIFECYCLE.md`), implemented with the dry run as the default argument, audited on every real run, and **not scheduled**.
- 57 new database assertions (305 total), 7 new unit tests on log and error-message privacy (157 total), 10 new end-to-end tests for the live journeys and 3 that run without a service.
- Brought the feature register up to date. It had not been updated since Milestone 2, so Milestones 3 to 6 were showing as "not started" — corrected row by row against the code, including two rows corrected *downwards*: there is no admin catalogue or taxonomy interface, and the library filters and sorts but has no free-text search.
- Corrected the roadmap's Milestone 3 line, which claimed admin taxonomy management that does not exist.

Found and fixed:
- Account deletion failed on a foreign key: the audit row referenced the account being deleted. The entry is now written first, with no actor and a digest instead of the id.
- The append-only guard refused the cascade through `account_merges`.
- Two overloads of `purge_stale_guests` made a call ambiguous.
- Nothing was testing the "no sensitive data in logs" rule — it held by construction only. Now seven tests drive the pipeline with an email address, a note and a token and assert that none of them appears in any line written or in any envelope returned.

Not done / limitations:
- **Full erasure is verified at the database layer, not end to end.** The directive asks that it not be claimed until the whole process is verified, so it is not claimed.
- 46 live-service tests remain skipped. `VSHARES_SUPABASE_SETUP.md` has the steps; it needs only the publishable key.
- No screenshots of the new screens with content: they need an account and a published card, which need the auth service and network access respectively.
- The guest purge is not scheduled, by decision.


### 2026-11-14 — Milestone 5: first learning win, library and progress

Done:
- The first learning win: home topic chips lead straight to one useful card at `/start/[topic]`, readable with no account and no sign-up wall. Pressing "Got it" is the first thing that persists, so that is where a guest account appears; the win summary then states what was completed and offers to keep it without blocking anything.
- The saved library: filtering by topic, three sorts, removal, attribution, empty states, and isolation enforced by row-level security.
- The progress dashboard: six numbers, each with its definition on the card, counted from completion records only. An explicit note on what is deliberately absent and why.
- PATH: next best move from an ordered rule engine, with the rule that fired given as the reason.
- Consent-first measurement: aggregate counts with no identifier for everyone, identified events only on granted consent, automatic deletion on withdrawal, and a first-win funnel.
- `VSHARES_SUPABASE_SETUP.md`, so the 32 skipped tests can be cleared without needing anything privileged.

Not done:
- The rendered journeys still need a service. 32 tests are written and skipped.

### 2026-11-14 — Milestone 4: the Intelligent Value Feed

Done:
- Feed migration: preference memory, per-viewer interactions, platform counters, versioned ranking configurations, sessions and a recommendation log with component breakdowns. Interactions and affinity are writable only through functions.
- VAI ranker v1: a deterministic weighted sum over seven named components with two penalties, documented factor by factor in the architecture. 43 unit tests cover determinism, cold start, each component, repetition, personalisation off, and that re-weighting genuinely reorders.
- Finite seven-card sessions with variety rules and one discovery slot; explanations generated from the logged components, so no unused reason can appear.
- The Learn tab: card position, session progress, category, time, save, like, skip, "Got it", source attribution, "Why this?", and a session summary that counts only what was finished.
- Measured query performance on 5,000 cards and 30,000 interactions, which found a sequential scan and an index that made it eight times faster.
- The editorial checklist, and Productivity candidates prepared for batch 2 without writing the cards.

Not done:
- The live journeys still need a configured service; 22 tests are written and skipped.
- Batch 1 remains draft and unverified.

### 2026-11-14 — Milestone 3: catalogue, content management and moderation

Done:
- Catalogue migration: categories, topics, content items, immutable content versions, secondary topics, moderation actions, content reports and the audit log, with row-level security on all of them.
- Publication rules enforced in the database: a review is required, the source link must have been checked by the privileged link checker, high-impact content needs a reviewer who did not submit it, and the high-impact flag is inherited from the category so it cannot be forgotten.
- Functions for the whole lifecycle: taxonomy management, card creation and versioning, public submission, moderation, reporting and report resolution — each role-checked and audited.
- Content module split into a client-safe barrel and a server-only read module; Explore and category pages now read from the database; public card pages at `/c/[slug]` with full attribution; the admin area with a moderation queue, answering 404 to accounts without a role.
- A link checker that records real results, and the launch taxonomy plus the first 10 value cards as seed data.
- 77 new database assertions, bringing the suite to 166.

Four defects were found by the tests; three would have failed in production. They are in the test report.

Not done:
- Source links are unverified: this environment refuses every outbound request. No card can be published until the checker passes somewhere with network access.
- The rendered catalogue and the live authentication journeys need a configured service; 14 tests are written and skipped with stated reasons.

### 2026-11-14 — Milestone 2: identity, authentication and profiles

Done:
- Identity migration: `profiles`, `user_roles`, `preferences` and `account_merges`, with row-level security on every table, generated handles, the signup trigger, role functions, the non-destructive merge function and the stale-guest purge.
- Auth adapter behind `platform/auth`: magic link, Google (ready, no credentials needed to build), anonymous guests, in-place upgrade, collision handling, sign-out and sign-out everywhere. The action pipeline now resolves the viewer through it.
- Profiles and personalisation modules with validated partial updates; sign-in page and form; auth callback using the tested redirect sanitiser; the You tab rebuilt around a real profile.
- Session refresh moved into the platform layer after the architecture lint rule caught the proxy importing the vendor SDK.
- A database test harness and 89 assertions against real PostgreSQL; the suite added to continuous integration against a PostgreSQL service.
- Continuous integration executed for the first time on pull request #8 and all four jobs passed, including the secret scan. The Milestone 1 verification gap is closed.

Two defects were found that would have broken production: account creation would have failed on a project where pgcrypto lives in another schema, and account deletion would have failed once a merge record existed. Both are fixed and covered by tests.

Not done:
- The auth service journeys cannot be exercised here (no container runtime). The tests for them exist and are skipped with a stated reason.

### 2026-11-14 — Milestone 1: foundation and shell

Done:
- Replaced the legacy application. Removed `app/`, `components/`, `lib/`, `middleware.ts`, the copy-grep smoke script, the legacy migration and seed, the Tailwind config and the Render blueprint. All of it remains in git history and on `main`.
- Built the new structure: `src/app`, `src/modules` (eight live modules plus two reserved), `src/platform`, `src/components`, `src/styles`, `supabase`, `tests`.
- Platform layer: validated configuration, result envelope, structured logging without personal data, rate limiter, database clients (request, public, privileged), the action pipeline, feature flags, the auth boundary and the redirect sanitiser.
- Security: all headers set, and a per-request nonce-based Content-Security-Policy with no `'unsafe-inline'` for scripts. The demo-mode authentication bypass is gone with the code that held it.
- Design system: tokens for black, gold, silver, white and the blue accent, every pairing contrast-measured; Sora and Inter self-hosted; primitives; an original VSHARES mark; a component gallery at `/dev/ui` that is not served in production.
- Shell: five-tab navigation (PATH, LEARN, EXPLORE, SAVED, YOU) as a bottom bar on phones and a side rail on desktop, with a real route behind every entry. Explore navigates the eight approved categories and their forty topics.
- Baseline migration with the identity helpers that row-level security will use, so policies never call the vendor's functions directly.
- Tests: Vitest and Playwright with axe, 54 unit and 44 end-to-end checks; CI extended to run hygiene, lint, types, unit tests, build, end-to-end, audit and the secret scan.

Three defects were found and fixed during the work; they are listed in the test report.

Not done:
- CI has still never executed (it runs on pull requests and on `main`), so it is unverified rather than passing.
- No database, accounts, catalogue, feed or progress: those are Milestones 2 to 7.

### 2026-11-14 — Project separation and platform directive

Done:
- Recorded the permanent decisions: VSHARES is independent of all trading projects (D-025); Lovable is not used (D-026); deployment to be chosen separately (D-029).
- Cross-project audit of every remote branch: the only trading-related files anywhere are the two already removed from this branch (still at the tip of `main` until this branch is merged). No Python files, brokerage or Lovable dependencies, shared configuration, imports or environment variables.
- Added `npm run check:hygiene` and wired it into CI (verified passing, and verified failing on a planted `.py` file).
- Added the portability and vendor-boundary section to the architecture; RLS policies now specified against our own SQL helpers.
- Owner confirmed the leaked credentials are revoked; SEC-2026-001 updated.

### 2026-11-14 — Phase 1

Done:
- Owner decisions recorded (product, brand, content sources, audience, stack, MVP scope, auth, security authorisations).
- Removed the unrelated trading script and its notes; audited all branches and history for credentials (leak confined to one commit on `main`; nothing else found).
- Added CI workflow (lint, typecheck, smoke, build, audit, gitleaks) and `.gitleaks.toml`; extended `.gitignore`.
- Pinned all dependencies and upgraded within current majors: audit 19 → 8 (0 in production dependencies). Lint, typecheck, smoke and build pass after a clean install.
- Fixed the open redirect in the legacy auth callback.
- Inspected PRs #3 and #4; wrote the PR disposition report.
- Wrote or rewrote: master spec, feature register, architecture (incl. auth design and ranking spec), data model, API contracts, design system, security model, roadmap, release plan, test report.

Not done / limitations:
- CI has not executed yet (it runs on pull requests and on `main`); gitleaks could not be run locally.
- The legacy demo-mode bypass still exists in legacy code until M1/M2 replaces it.
- The earlier Lovable version was not inspected; it is historical reference only and nothing depends on it.
- Existing Supabase / Render connections could not be verified (no credentials or references available).
- One moderate, dev-only dependency advisory remains (see security doc §7).

### 2026-11-18 — Phase 10.8 (Editorial Review Workbench)

- Built a reviewer-only Editorial Review Workbench: a dashboard of the ten
  Originals with statuses, content states (all draft), claim-level evidence
  (source/authority/direct-vs-indirect/contradictory/date/concerns), a
  qualitative evidence indicator computed from recorded fields, related
  multimedia (marked NOT fact-checked), and publication blockers.
- Human decision workflow (approve / request revision / reject / escalate) with
  reviewer name + rationale + time, persisted LOCAL-ONLY (localStorage) — never
  writes the DB, never publishes. validateDecision refuses the generating agent
  as reviewer and blocks high-impact approval without an independent second
  review (unit-tested).
- Real surface /admin/editorial is staff-gated by the admin layout (server-side);
  /dev/editorial is a dev-only accessibility preview. E2E asserts both 404 to
  unauthorised/unconfigured requests. 0 axe violations on /dev/editorial.
- Suite: typecheck, lint, 319 unit (4 live skipped, 13 editorial), 27 DB / 457,
  94 e2e / 72 skipped, build, hygiene 380. Screenshot + preview instructions +
  persistence roadmap in VSHARES_PHASE10_8_REPORT.md. No remote write/publish.

### 2026-11-18 — Phase 10.7 (Originals evidence hardening & review pack)

- Claim-level audit of all ten Originals with real, independent evidence. Key
  correction: the sleep card's "consistent wake time does more than a fixed
  bedtime" is overstated — independent research (UK Biobank regularity study;
  clinical circadian sources) supports overall regularity and wake time as a good
  anchor, but there is no head-to-head wake-vs-bedtime proof; the claim was
  revised to avoid unproven certainty.
- Produced docs/VSHARES_ORIGINALS_REVIEW_PACK.md: per-card revised copy, claim-by
  -claim evidence (source, authority, method, supports?, qualifying, confidence),
  outstanding concerns, media relationships, reviewer sign-off fields, and a
  high-impact independent second-review checklist (agent is NOT the reviewer).
  Statuses: 7 READY FOR HUMAN REVIEW, 3 REVISION REQUIRED, 0 EVIDENCE BLOCKED;
  READY never implies approval.
- Remote read-only: no key/DB route from this session, so hosted catalogue state
  is unread; distinguished the local fresh-seed baseline from the hosted state
  (owner verifies). No publication, no approval. Suite green (306 unit / 4 live
  skipped, 27 DB / 457, 92 e2e / 72 skipped, build, hygiene 379).

### 2026-11-18 — Phase 10.6 (first Originals collection & media readiness)

- DB-verified baseline (fresh apply of 9 migrations + seeds): 10 cards, all
  draft, 0 published, 0 link-checked, 0 content_media — zero-published confirmed.
- Prepared ten Originals (VSHARES_ORIGINALS_BATCH_1.md): six reuse/improve the
  seed drafts, four are new and host the five candidate videos (every video has a
  legitimate same-topic parent). Each card has a hook, objective, explanation,
  claims, source, takeaway, category/difficulty, quality and freshness.
- Real evidence (docs/samples/originals-evidence.json): robots-aware retrieval of
  all ten sources — 8/10 with passages, MoneyHelper robots-blocked, NHS/Khan
  JS-rendered, one claim verified against a NASA passage, rest honestly
  unsupported. Nothing fabricated.
- Review inventory: 7 ready for human approval, 3 revision, high-impact (budget,
  sleep) need a second reviewer (not self-approved). Development-only publication
  procedure (card then hosted media, RLS/editorial gates, rollback) documented;
  not executed. Full suite green (306 unit / 4 live skipped, 27 DB / 457, 92 e2e,
  build, hygiene 374). Report: VSHARES_PHASE10_6_REPORT.md.

### 2026-11-18 — Phase 10.5B-2 Gate 2 (multimedia editorial verification)

- Migration 9 confirmed applied to the dev project by the owner. Re-confirmed all
  five videos embeddable via live oEmbed; remote content_media not readable from
  this session (no anon key → 401; owner verifies with the Gate-1 read-only SQL).
- Editorial verification: this agent cannot watch video content, so every video
  is FACT-CHECK INCOMPLETE at the content level (oEmbed metadata is not treated as
  fact-checking). Verified the substantive topic claims against independent
  sources: grit is real-but-modest and overlaps conscientiousness (Credé et al.
  2017); the black-hole information paradox remains unresolved.
- Decisions: 0 READY, 2 REVISION REQUIRED (Kurzgesagt open-problem framing; Grit
  balancing note), 0 REJECTED, 3 VERIFICATION BLOCKED (human viewing required).
- Publication readiness: found a real blocker — content_media is publicly visible
  only under a PUBLISHED parent card, and the catalogue has 0 published cards, so
  approved media cannot be shown yet. Documented the owner-authorised, server-
  write-only insert pathway and per-video approval requirements. No media inserted
  or published. Doc: VSHARES_GATE2_EDITORIAL_VERIFICATION.md.

### 2026-11-18 — Phase 10.5B-2 (Gate 1 preparation — apply migration 9 to dev)

- Read-only preparation for applying migration 9 to the dev project. Verified
  branch/commit (7283816), dev project ref (apgchptregdpswiwmyua, no creds), and
  that migration 9's dependencies all exist in migration 3 (correctly ordered).
- Audited migration 9 safety (constraints, least-privilege grants, RLS, parent
  visibility, staff, server-write-only, indexes; flagged non-idempotent/
  forward-only as the only limitation). No discrepancy.
- Preflight: applied harness + all 9 migrations to a FRESH local DB clean;
  introspection confirmed RLS on, 2 select policies, SELECT-only app grants,
  expected indexes. Suite green (typecheck, 305 unit, 27 DB / 457 assertions).
- Produced the Gate-1 execution plan (owner-run commands, read-only verification,
  failure/recovery, stop points) and a GO/NO-GO report: recommendation **GO
  (development only)**. No remote command executed; this session cannot reach the
  remote DB. Docs: VSHARES_GATE1_EXECUTION_PLAN.md, VSHARES_GATE1_REPORT.md.

### 2026-11-18 — Phase 10.5B-1 (multimedia activation readiness & reliability)

- Hardened the media read: listApprovedMedia now routes results through pure,
  tested helpers that return an empty feed for missing-schema and empty results
  (no log) and log a safe structured warning (category + code only, no PII) for
  permission/connection/other failures — the public feed stays usable in every
  case. Unit tests distinguish missing_schema / permission_denied / connection /
  other and empty vs populated success.
- Expanded the editorial inventory with per-video evidence and an explicit
  "claims reviewed: NO" plus factual concerns for each of the five videos.
- Wrote a development-only activation procedure (preconditions, migration + read
  checks, RLS verification, failure handling, recovery, explicit owner STOP
  points) and the unified-feed architecture roadmap (one VAI-ranked session;
  design only, separate from activation).
- Full suite: typecheck, lint, 305 unit (3 live skipped), 27 DB files / 457
  assertions, 92 e2e / 72 skipped, build, hygiene (368), 0 axe violations on
  /dev/media. Report: VSHARES_PHASE10_5B1_REPORT.md. No remote change.

### 2026-11-18 — Phase 10.5A (production feed integration, local-first)

- Wired approved media into the real /learn feed: `listApprovedMedia` reads
  content_media through the ordinary request client (RLS gates it; no
  service-role bypass; returns [] when migration 9 is absent). /learn renders a
  VAI-ranked media section below the value session only when approved media
  exists — otherwise unchanged (safe fallback). Media never ranked by views/likes.
- Added migration 9's objective column; extended 270_content_media.sql with a
  parent-card-visibility case (published media on a draft card stays hidden).
  Migration 9 remains local only.
- Licensed-image adapter now requests JSON and detects Openverse's anonymous
  HTML throttle page, reporting it honestly (BLOCKED) rather than faking an
  image; the image card stays a labelled placeholder. Prepared the five videos
  with an explicit five-stage approval gate (only metadata + embedding done).
- Produced the migration-9 readiness review + owner-approval checklist (not
  applied). Full suite: typecheck, lint, 300 unit (3 live skipped), 27 DB files /
  457 assertions, 92 e2e / 72 skipped, build, hygiene (361), 0 axe violations on
  /dev/media. Report: VSHARES_PHASE10_5A_REPORT.md; decision D-110.

### 2026-11-18 — Phase 10.4 (real multimedia feed integration & editorial readiness)

- Turned the multimedia prototype into a tested React feed: accessible,
  mobile-first `MediaFeed` (scroll-snap, keyboard + touch, no autoplay,
  pause-when-inactive, reduced-motion + data-saver, attribution) rendered at a
  dev-gated `/dev/media` route (404 in production), VAI-ranked (popularity never
  an input). Axe: 0 violations at both viewports.
- Added migration 9 `content_media` (provider reference + attribution + licence,
  FK to content_items) with content_items-style RLS: published+parent-readable
  for the public, all for staff, server-write-only. Proven by
  `270_content_media.sql` (approved-only visibility, cross-user isolation, no
  client write). NOT applied to any remote database.
- Built a licensed-image adapter (Openverse) that records source/licence/
  attribution and rejects unclear reuse rights (conservative allowlist). Prepared
  the five oEmbed-verified videos for human review
  (`VSHARES_MEDIA_EDITORIAL_INVENTORY.md`) — none approved or published.
- Full suite: typecheck, lint, 293 unit (2 live skipped), 27 DB files / 456
  assertions, 92 e2e / 72 skipped (incl. `/dev/media` 404), build, hygiene (354),
  and 0 axe violations on the feed. Report: `VSHARES_PHASE10_4_REPORT.md`; D-109.

### 2026-11-18 — Phase 10.3M (multimedia knowledge engine & embedded feed)

- Built a provider-independent, embed-only multimedia engine (`src/factory/media/`):
  YouTube/Vimeo URL validation, privacy-respecting embeds (youtube-nocookie,
  captions, no autoplay, provider controls preserved, attribution kept),
  candidate verification, a DISCOVER→…→REVIEW pipeline that never approves or
  publishes (default-deny), and VAI ranking that forces platform stats to zero so
  popularity never ranks a video.
- Live-verified 5 real educational videos (3Blue1Brown ×2, Kurzgesagt, TED, free
  CodeCamp) via public YouTube oEmbed (no API key) and built an accessible,
  social-style vertical feed prototype (`docs/samples/media/multimedia-feed.html`)
  mixing video, image and text cards — scroll-snap, keyboard nav, pause-inactive,
  reduced-motion and data-saver aware.
- 19 offline tests (provider validation, embedding restrictions, invalid media,
  no auto-approval, high-impact escalation, popularity-is-not-quality ranking,
  oEmbed, prototype accessibility); live demo gated behind FACTORY_LIVE.
- Full suite: typecheck, lint, 289 unit (2 live tests skipped offline), 90 e2e /
  72 skipped, build, hygiene (340) all pass. Nothing downloaded, published or
  written to the database. Report: `docs/VSHARES_PHASE10_3M_REPORT.md`; D-108.

### 2026-11-18 — Phase 10.3 (live research, live TAI & evidence verification)

- Built the network-capable live layer (`src/factory/live/`, injected
  HttpFetcher so tests stay offline): robots-aware/rate-limited source adapter
  with passage + timestamp extraction and failure recording; claim verification
  against retrieved passages (verified/unsupported/contradictory/unavailable,
  rejecting fabricated quotes; reputation is never verification); an Atom/RSS
  trend adapter with real timestamps + provenance; and a research integration
  wired into the existing rubric/safety/dedup.
- 25 offline tests cover network failure, timeout, rate limit, http error, robots
  disallow/unavailable, missing timestamp, fake-citation rejection, feed parsing,
  insufficient momentum, stale trends, duplicate clustering, high-impact
  escalation, default-deny publishing and deterministic cache replay.
- Real demonstration (through the proxy, `docs/samples/live/`): 5 real sources
  retrieved (robots-checked, rate-limited; NCSC had a real Last-Modified), **2
  claims genuinely verified against real passages**, the rest honestly
  unsupported (NHS page JS-rendered → 0 passages); MoneyHelper BLOCKED (robots
  403, not crawled); both trend feeds returned 40 real timestamped observations,
  correctly reported INSUFFICIENT_DATA. An editorial evidence workbench
  (read-only HTML) shows every claim with its supporting passage. Nothing
  published; no DB write; nothing fabricated.
- Full suite: typecheck, lint, 269 unit (1 live test skipped offline), 90 e2e /
  72 skipped, build, hygiene (326) all pass. Report:
  `docs/VSHARES_PHASE10_3_REPORT.md`; decision D-107. STOP for review.

### 2026-11-18 — Phase 10.2 (Content Factory + TAI, first working version)

- Built a local-first, dry-run Content Factory and TAI under `src/factory/`
  (pure TypeScript, no database, no network, no new dependencies): source
  verification, duplicate detection, claim-level evidence/fact-check, the 8-axis
  rubric with hard floors, high-impact safety escalation, the
  RESEARCH→VERIFY→DRAFT→FACT-CHECK→GRADE→EDITORIAL QUEUE pipeline (default-deny
  writes, never publishes), and TAI (normalize/cluster/momentum/classify/
  credibility/expiry/propose) plus a curriculum planner where trends never
  displace essentials.
- Test-first: 30 factory unit tests + a demonstration integration test cover
  invalid-source rejection, missing-evidence handling, dedup, quality floors,
  high-impact escalation, classification, insufficient momentum, stale trends,
  default-deny writes, no-auto-publish and deterministic fixtures.
- Demonstration (`docs/samples/`): 8 evidence-backed draft cards all reaching the
  editorial queue, all flagged for human fact-check, 2 high-impact needing a
  second reviewer; a TAI report that declares no live source is connected and
  marks real momentum NOT VERIFIED. No page was fetched, so no claim is marked
  verified — honest by construction.
- Full suite green: typecheck, lint, 243 unit (18 files), hygiene (308), 90 e2e /
  72 skipped, build. No remote write, no publish, no migration, no RLS change.
  Report: `docs/VSHARES_PHASE10_2_REPORT.md`; decision D-106. STOP for review.

### 2026-11-18 — Phase 10.1 (content universe architecture & factory blueprint)

- Documentation and planning only. Audited the existing content system (schema,
  DB admission gates, `source_url` dedup, moderation workflow, VAI ranker) and
  confirmed it is reusable as-is — the factory sits in front of `create_card`
  and moderation; the database stays the final admission authority.
- Wrote `docs/VSHARES_CONTENT_FACTORY.md` (10-agent architecture with a strict
  evidence/no-fabricated-citations contract, an 8-axis quality rubric with
  rejection/escalation thresholds where a high score never bypasses human
  approval, the RESEARCH→…→REFRESH/RETIRE lifecycle mapped to the schema,
  scaling plan for 100/500/2,000/10,000 with per-step quality gates, and a
  Phase 10.2 sequence) and `docs/VSHARES_CONTENT_TAXONOMY.md` (20-category
  universe — 8 existing reused, 12 proposed — with overlap control, plus a
  balanced 100-card pilot curriculum including Budgeting).
- No migration, no taxonomy/content rows, no publishing, no change to VAI
  admission or RLS. Proposed future migrations (evidence table, review_due_at,
  coverage view) are additive and owner-gated. STOP for owner review.

### 2026-11-18 — Phase 9.3 (controlled integration readiness)

- Documentation-only readiness pass at commit `880b6a6`. Confirmed the baseline
  (162 collected, 90/72/0 e2e, 211 unit, typecheck/lint/build pass, write
  governor operational) and wrote `docs/VSHARES_PHASE9_3_READINESS.md`.
- Audited the authenticated journey (12 steps — all covered at the code/DB
  layer; live execution blocked on key/content/writes), the 10 draft cards
  (reputable UK/official sources, all drafts with no link check; Budgeting
  present and high-impact), the 62 skips (grouped by prerequisite), and the
  security/privacy controls (all PASS; no RLS change).
- Produced a staged Phase 9.4 execution plan with entry/exit/rollback/STOP per
  stage, an editorial plan for ≥7 approved cards incl. Budgeting (no publishing),
  and a blocker register (B1–B8). No remote write, no account, no publish.

### 2026-11-17 — Phase 9 (live integration & security verification)

- Measured this session's reach, not assumed it: dev project URL is in
  `.env.local`, but the **anon key is absent everywhere** (config, shell,
  environment, network secrets) and direct Postgres to the dev project is
  unreachable. REST/auth return HTTP 401 (alive, needs the key).
- Verified every named security property against real PostgreSQL 16 by building
  a fresh DB from the 8 migrations and introspecting it: `app.apply_affinity`
  EXECUTE revoked from anon/authenticated/public; `record_session_review` is
  SECURITY DEFINER with ownership, the inclusive `[started_at, ended_at]`
  engagement window, and the per-user advisory lock; `engaged_count` present;
  RLS on all adaptive tables; ranking config v2 active.
- Confirmed the VAI admission gate: `content_items.status` defaults to `draft`,
  RLS on, feed serves only `published`; the ten seeded drafts stay unpublished.
- Ran the full quality gate at `95ba9f7`: typecheck, lint, hygiene, 200 unit,
  450 DB assertions (26 files), concurrency, 90 e2e + 72 skipped, build, prod
  audit 0 — all green. Dev-tree `picomatch` advisory still open; gate unchanged.
- Classified the 72 skipped live tests: all blocked on the missing anon key
  (subsets also need approved content / a staff account); 0 executable now,
  0 failing on a defect. No test weakened, no mock substituted.
- **No defect found → no code change.** No remote write, no migration applied,
  no merge, no publish. Evidence: `docs/VSHARES_PHASE9_VERIFICATION.md`.

### 2026-11-14 — Phase 0

- Audited `main`, 7 PRs and 6 unmerged branches; ran existing checks; wrote the discovery document. Found credentials committed to the public repository.
