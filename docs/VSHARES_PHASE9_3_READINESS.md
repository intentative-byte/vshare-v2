# VSHARES V2 — Phase 9.3 controlled integration readiness

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567` · **Commit:** `880b6a6`
- **Scope:** documentation only. No remote write, no account created, no card
  published, no RLS change, no live write test. Establishes exactly what remains
  between the verified read-only application and a secure, fully tested learning
  experience.
- **Classification key:** PASS (verified) · FAIL · BLOCKED (needs a prerequisite
  outside this session) · NOT VERIFIED (not exercised here).

## 1. Verified baseline

| Check | This session (unconfigured) | Status |
|---|---|---|
| Playwright collected | `--list` → **162** | PASS |
| Default-deny e2e | **90 passed / 72 skipped / 0 failed** | PASS |
| Unit | **211 passed** (15 files) | PASS |
| Typecheck · Lint · Build | all pass | PASS |
| Owner configured Windows run (reported) | 162 collected · after `880b6a6`, read-only set expected 100 passed / 62 skipped / 0 failed | PASS (owner-reported; this session cannot run configured) |
| Default-deny live write governor | write tests skip unless `VSHARES_LIVE_WRITES="true"` exactly; proven by unit tests + a Playwright demo | PASS |

No protection was weakened or removed. The 62 skips and the write gate are intact.

## 2. Authenticated user journey — coverage matrix

Route/action verified by code inspection; "live" means exercised through the
running app against Supabase (BLOCKED here — no anon key; owner-gated writes).

| # | Journey step | Route / mechanism | Logic/DB coverage | Live coverage | Status |
|---|---|---|---|---|---|
| 1 | Anonymous visitor discovers content | `/`, `/explore`, `/explore/[category]` | `catalogue-live` (read-only), shell.spec | read-only live runnable | PASS (logic) · live BLOCKED on taxonomy seed |
| 2 | Selects category & topic | `/explore/[category]` | `catalogue-live` topics+high-impact | read-only | PASS (logic) · live BLOCKED on seed |
| 3 | Begins a finite session | `/learn`, `start_feed_session` + `record_recommendations` | `session.test.ts`, ranker tests, `150_feed`/`160_interactions` | `feed-live` (WRITE) | PASS (logic) · live BLOCKED (writes + ≥7 published cards) |
| 4 | Guest identity only when appropriate | guest created on first **action**, not on browsing | `200_guest_lifecycle.sql`, `feed-live`/`first-win-live` cookie asserts | WRITE | PASS (DB) · live BLOCKED (writes) |
| 5 | Registers via Supabase auth (magic link) | `/sign-in`, `auth-live` | `auth-live` (WRITE+INFRA) | WRITE + SMTP | PASS (form logic) · live BLOCKED (writes + SMTP sink) |
| 6 | Progress survives registration | guest→account merge | `070_account_merge.sql`, `200_guest_lifecycle.sql` | WRITE | PASS (DB) · live BLOCKED (writes) |
| 7 | Completes a learning card | `Got it` → interaction | `160_interactions.sql`, `first-win-live` | WRITE | PASS (DB) · live BLOCKED (writes + published card) |
| 8 | Saves and removes content | `/saved`, save/remove | library tests, `first-win-live` save test | WRITE | PASS (DB) · live BLOCKED (writes + published card) |
| 9 | Reviews learning history | `/you` ProgressDashboard; `/you/submissions` (now server-rendered) | `first-win-live` dashboard; `data-rights-live` my-submissions (read-only) | read-only + WRITE | PASS (logic) · live BLOCKED on content/account |
| 10 | Requests personal data (export) | `/you/data` → `export_my_data` | `190_data_rights.sql`, `data-rights-live` export (WRITE) | WRITE | PASS (DB) · live BLOCKED (writes) |
| 11 | Deletes account | `/you/data` → `delete_my_account` | `190_data_rights.sql` | WRITE | PASS (DB) · live BLOCKED (writes) |
| 12 | Signs out securely | `/you` SignOutButtons; sign-out everywhere | `auth-live` sign-out (read-only self-skip) | read-only | PASS (logic) · live NOT VERIFIED (needs a session) |

**Prerequisites / gaps:** every write step is gated (correctly) behind
`VSHARES_LIVE_WRITES=true` and needs a seeded+published catalogue; magic-link
registration additionally needs an SMTP sink. No missing *code* coverage was
found — the gap is live execution, which is owner-authorised in Phase 9.4.

## 3. Editorial content readiness — matrix (10 draft cards)

All ten load as **draft** with `link_checked_at = null` (unpublishable by
design). All `beginner`. Sources are reputable UK/official or named authors.

| # | Slug | Category · Topic | Learning objective (takeaway) | Source | Link-checked | High-impact | Quality | Publication eligibility |
|---|---|---|---|---|---|---|---|---|
| 1 | machine-learning-crash-course | Technology · AI Foundations | How models are trained & evaluated | Google | ✗ (null) | no | 85 | needs link check + 1 approval |
| 2 | staying-secure-online-basics | Technology · Security Basics | The few security steps that matter | NCSC | ✗ | no | 90 | needs link check + approval |
| 3 | asking-for-your-own-data | Technology · Data & Privacy | Exercising the right of access | ICO | ✗ | no | 85 | needs link check + approval |
| 4 | **building-a-first-monthly-budget** | **Personal Finance · Budgeting** | Build a first monthly budget | MoneyHelper | ✗ | **yes** | 85 | link check + approval **by a second reviewer** |
| 5 | spotting-financial-scams | Personal Finance · Avoiding Scams | Pause-challenge-protect against fraud | Take Five | ✗ | **yes** | 85 | link check + second-reviewer approval |
| 6 | getting-to-sleep-nhs-guidance | Health & Wellbeing · Sleep | Evidence-led sleep basics | NHS | ✗ | **yes** | 90 | link check + second-reviewer approval |
| 7 | writing-people-understand | Communication · Clear Writing | Plain, usable writing | Government Digital Service | ✗ | no | 85 | link check + approval |
| 8 | preparing-for-an-interview | Career · Interviews | Structured interview prep | National Careers Service | ✗ | no | 80 | link check + approval |
| 9 | spaced-repetition-for-memory | Learning How to Learn · Spaced Repetition | Why spaced review works | Michael Nielsen | ✗ | no | 80 | link check + approval |
| 10 | setting-up-a-business-uk | Career · Running a Small Business | Steps to set up a UK business | GOV.UK | ✗ | no | 80 | link check + approval |

**Accuracy & freshness:** each summary must be checked against the live page
before approval (owner decision D15 still open). Sources are stable official
pages; re-check dates on approval.

**High-impact safeguards (verified in code):** `moderate_content` refuses to
publish a card whose **source link has not been checked**, and refuses
**high-impact** content approved by the person who submitted it (a second
reviewer is required). So cards 4, 5, 6 cannot be self-approved.

### Controlled plan for ≥7 published cards (incl. Budgeting) — no publishing here
1. **Link-check** all ten: run `npm run check:links` where the source hosts are
   reachable; it writes `link_checked_at` via `record_link_check`. Entry: owner
   authorises network + writes. (BLOCKED here — network/writes owner-gated.)
2. **Editorial review** each summary against the live page; correct house style
   (D15). Record accuracy/freshness sign-off.
3. **Approve the 7 non-high-impact cards** (1,2,3,7,8,9,10) through the
   moderation UI (`/admin/cards`) as a moderator/admin → `published`.
4. **Approve the 3 high-impact cards** (4 Budgeting, 5, 6) with a **second
   reviewer** distinct from whoever created/submitted them.
5. **Minimum for the seven-piece live journey:** ≥7 published including
   **Budgeting** (card 4) for `first-win-live`. Approving cards 1,2,3,4,7,8,9
   gives 7 with Budgeting while deferring the high-impact pair if desired — but
   Budgeting is itself high-impact, so at least one second-reviewer approval is
   required. **STOP for owner approval before any approval/publish.**

## 4. Integration test readiness — the 62 skips

Grouped by prerequisite (per `docs/VSHARES_LIVE_TEST_INVENTORY.json`; counts ×2
projects):

| Requirement | Tests | Default state |
|---|---|---|
| Authenticated account (guest auto-created or registered) | feed completion, first-win completion/save, auth magic-link | gated write |
| Database writes | all 32 write tests | gated (`VSHARES_LIVE_WRITES≠true`) |
| Published content | feed (12), first-win (10), share/report (4), catalogue needs taxonomy | blocked on catalogue |
| Administrator / moderator role | admin-live (10) | hard-skipped |
| Analytics rollup | analytics-live (16) | hard-skipped |

**Isolated fixtures (design, not built — write tests stay disabled):**
- **Test principals:** disposable guest sessions created by the journey itself
  (no pre-seeded users); for registered-user tests, a dedicated dev test mailbox
  via the SMTP sink. Never real user credentials.
- **Content fixture:** a known published set (the seven approved cards) so
  assertions are deterministic; `getting-to-sleep` stays draft to keep the
  "draft is 404" read-only check honest.
- **Cleanup:** after a write run, delete the guest accounts, submissions,
  reports, interactions, saves and reviews the run created (scoped by the test
  principal ids), leaving the catalogue and taxonomy intact. Reconcile row
  counts before/after.
- **Verification checks:** read-only tripwire stays on for read-only specs;
  write specs assert the expected row deltas and that no other principal's rows
  changed.

## 5. Security & privacy findings

| Control | Evidence | Status |
|---|---|---|
| Row-level security on every table | migrations + cross-user tests (`130`,`160`,`190`,`200`,`230`,`240`,`250`,`260`) | PASS |
| Anonymous vs authenticated boundaries | unauthenticated REST/API returns 401; `130` "signed-out visitor cannot see a pending submission" | PASS |
| Session handling | guest on first action only (`200`); sign-out everywhere ends all sessions | PASS (DB) · live sign-out NOT VERIFIED |
| Account deletion safeguards | `190_data_rights.sql`; `delete_my_account` removes reviews/preferences/submissions | PASS (DB) |
| Data export authorization | `export_my_data` is owner-scoped (`190`); export is a read of own data | PASS (DB) |
| Content moderation permissions | `230_admin_access.sql`; moderators/admins only; link-check + second-reviewer gates | PASS |
| Admin-only access | `230`; three-layer guard (route, action `access:"moderator"/"admin"`, RLS) | PASS |
| Logging & secret protection | no secret in repo; `/api/ready` leaks no config; audit entries hold no rating/format/note | PASS |
| Read-only test enforcement | `enforceReadOnly` tripwire + describe-level gates; **best-effort, cannot see server-side GET writes** (documented) | PASS (as a tripwire) |
| `app.apply_affinity` not client-executable | EXECUTE revoked from anon/authenticated/public (D-102) | PASS |
| Session-review eligibility (inclusive window, advisory lock) | `260_review_window.sql`, `test:concurrency` | PASS |

No RLS policy was modified. No finding is FAIL. The one honest limitation is the
read-only monitor's best-effort nature (§documented in D-105), mitigated by
gating every write-producing journey.

## 6. Blocker & dependency register

| ID | Blocker | Blocks | Owner action | Severity |
|---|---|---|---|---|
| B1 | No anon key in this session | all live verification here | set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (never pasted in chat) | high |
| B2 | Migration-application state on dev project unverified | live schema/RLS | confirm 8 migrations applied via `supabase db push` | high |
| B3 | No published catalogue (10 drafts) | §2 steps 3,7,8,9; feed/first-win live | §3 plan: link-check + approve ≥7 incl. Budgeting | high |
| B4 | Link-checking needs network + writes | B3 | authorise `npm run check:links` | medium |
| B5 | Write tests disabled by default (by design) | authenticated-journey live tests | explicit `VSHARES_LIVE_WRITES=true` in Phase 9.4 only | medium |
| B6 | SMTP sink for magic-link | `auth-live` writes | dev inbucket/`[local_smtp]` config | medium |
| B7 | Staff/admin accounts + a computed rollup | admin-live (10), analytics-live (16) | provision dev staff accounts; run the rollup job | medium |
| B8 | `picomatch` dev-tree advisory open | green CI audit | approve two-tier gate (D-099) or await upstream fix | low |

## 7. Phase 9.4 — proposed controlled test execution plan

Each stage has entry/exit/rollback/STOP. Nothing in Phase 9.4 runs without the
owner satisfying the entry criteria; write stages require an explicit
authorisation token.

**Stage 1 — Read-only verification.** Entry: anon key set; migrations applied;
taxonomy seeded. Run `catalogue-live` + the read-only data-rights/auth tests.
Exit: all read-only live tests green. Rollback: none (no writes). STOP if any
read-only test fails or the monitor trips.

**Stage 2 — Dedicated test-account preparation.** Entry: Stage 1 green; owner
authorises a disposable dev test mailbox. Prepare principal ids + the SMTP sink.
Exit: a test mailbox receives a magic link. Rollback: delete the test mailbox.
STOP if any real user data is touched.

**Stage 3 — Explicit write-test authorization.** Entry: owner sets
`VSHARES_LIVE_WRITES=true` for the run only. Exit: governor confirms writes
enabled for the intended specs only. Rollback: unset the flag. STOP unless the
owner has explicitly authorised writes for this run.

**Stage 4 — Authenticated learning journey tests.** Entry: Stages 1–3; ≥7
published cards incl. Budgeting. Run `feed-live` + `first-win-live` +
data-rights writes. Exit: journeys pass; expected row deltas only. Rollback:
delete the run's guests/interactions/saves/submissions/reports by principal id.
STOP on any cross-principal row change.

**Stage 5 — Content moderation & editorial checks.** Entry: moderator/admin
accounts. Run `admin-live`; verify draft→link-check→approve, second-reviewer on
high-impact. Exit: lifecycle holds; no self-approval of high-impact. Rollback:
archive/delete any card created by the run. STOP if an unchecked or
self-approved high-impact card can publish.

**Stage 6 — Analytics verification.** Entry: staff account + a computed rollup.
Run `analytics-live`. Exit: figures carry definitions, suppression holds.
Rollback: delete test rollups. STOP if a figure lacks its definition or leaks a
small-count value.

**Stage 7 — Cleanup & database-state reconciliation.** Entry: Stages 4–6 done.
Delete all test-created rows; compare row counts to the pre-run snapshot. Exit:
only the intended published catalogue remains; no orphan test data. Rollback:
restore from the pre-run snapshot. STOP if reconciliation shows unexpected rows.

**Stage 8 — Final regression & evidence review.** Entry: Stage 7 reconciled.
Run the full suite (typecheck, lint, unit, test:db, concurrency, e2e, build,
audit) and record exact results. Exit: all green; evidence captured. Rollback:
n/a. STOP before any merge/deploy — owner review required.

## 8. Classification summary

- **PASS:** baseline (§1); all code/DB-layer journey coverage (§2); security &
  privacy controls (§5).
- **BLOCKED:** every live journey and the seven-piece session (anon key,
  migrations, published catalogue, writes) — B1–B7.
- **NOT VERIFIED:** live sign-out (needs a session); live rendered journeys.
- **FAIL:** none.

**Bottom line:** the application is internally complete and secure at the code
and database layers; what remains between it and a fully tested learning
experience is **operational, not structural** — a key, applied migrations, a
published catalogue, and an owner-authorised write-test window, executed through
the staged plan in §7. **STOP for owner review before Phase 9.4.**
