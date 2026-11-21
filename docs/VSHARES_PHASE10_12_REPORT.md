# VSHARES — Phase 10.12 report: Editorial Dashboard Hardening

- **Date:** 2026-11-21 · **Branch:** `claude/gallant-mendel-xey567` · **Start commit:** `92ac9cd`
- Hardened the authenticated editorial dashboard (review states, filtering,
  reviewer guidance, robust error/loading handling, accessibility) while
  preserving governance, security and content-quality rules. **No publication, no
  automatic approval, no RLS change, no hosted writes, no remote push.**

## 1. Executive summary

The authenticated workbench at `/admin/editorial` now derives and shows an explicit
**review state** per item (pending review · pending second review · revision
requested · rejected · approved-eligible · no-revision), offers a **filter bar**
(review status, impact level, category/topic, "awaiting my review"), gives
**per-decision guidance** and **plain-language reviewer explanations** in the audit
ledger, and handles **expired sessions, forbidden access, duplicate approvals,
missing content, stale revisions and network failures** with clear, accessible
feedback. All decision logic that drives the UI was extracted into a **pure,
framework-free module** and exhaustively unit-tested. Server authentication, role
enforcement, RLS, the append-only audit trail and the two-distinct-reviewer quorum
are unchanged and still enforced in three layers (admin layout → `access:"moderator"`
action → DB `is_staff()` + RLS). **Publication remains disabled.**

Everything here is **locally verified**. **Hosted acceptance is NOT claimed:** this
session still has no anon key (hosted REST → 401), so no signed-in browser run was
possible.

## 2. Files changed

| File | Change |
|---|---|
| `src/components/editorial/review-state.ts` | **New.** Pure logic: `deriveReviewState`, `reviewerExplanation`, `DECISION_GUIDANCE`, `matchesFilters` + filter types. No React/DB/I/O. |
| `src/components/editorial/authenticated-editorial-workbench.tsx` | Filter bar; per-item review-state badge + explanation; decision-type guidance; reviewer explanations in the ledger; dedicated `role="alert"` error region with code-based messages (session expired / forbidden / rate-limited / conflict / not-found / network); loading state; filtered empty-state. |
| `src/app/dev/editorial-auth/page.tsx` | Expanded the accessibility preview to two items (a high-impact "pending second review" and a standard "pending review") so filters and states render. |
| `tests/unit/editorial/review-state.test.ts` | **New.** 16 unit tests for the pure logic. |

No database migration, no schema change, no change to `/admin/editorial`'s security
gate, the server action, or the governance SQL.

## 3. Database changes

**None proposed.** The phase is UI/logic hardening on top of the existing
governance schema (migrations 10 & 11). No migration, no hosted write.

## 4. Features completed

- **Clear review states** derived deterministically from the server-provided
  approvals/eligibility (never recomputed in the browser): eligibility wins;
  otherwise the latest decision on the current revision, with the high-impact
  one-of-two case called out.
- **Moderation/triage filtering** on the editorial board: by review status, impact
  level, category/topic, and **reviewer eligibility** ("Awaiting my review" hides
  items the viewer has already acted on or that are already decided). Live
  "Showing N of M" count (`aria-live`).
- **Reviewer explanations:** contextual guidance for Approve / Request revision /
  Reject / Escalate in the form, and a one-line description of every recorded
  decision in the audit ledger (with a "superseded revision" flag).
- **Accessible feedback & resilience:** `role="alert"` error region and
  `role="status"` confirmation; session-expired, forbidden, rate-limited,
  duplicate-approval (conflict), missing-content (not-found) and network-failure
  messages that never claim a write that did not happen; disabled/"Recording…"
  loading state; thrown-error (dropped request) caught so the UI stays honest.
- **Responsive & keyboard-first:** native `SelectField`/`TextArea`/`TextField`/
  `Button`/`details` throughout; filter grid reflows 1→2→4 columns.

## 5. Security and governance verification

- **Access unchanged:** `/admin/editorial` still `notFound()`s for non-staff and
  when the DB is unconfigured (admin layout); the action is `access:"moderator"`;
  the DB function re-checks `app.is_staff()`; `editorial_decisions` RLS select is
  staff-only. No RLS weakened, no service-role in the review path.
- **Quorum preserved:** two distinct reviewers for high-impact; duplicate approval
  refused by the DB; eligibility is read from `editorial_publication_eligible`,
  never decided client-side. The filter/state logic only *describes* these.
- **Audit integrity preserved:** append-only ledger and hash chain untouched; a
  non-validating chain is surfaced as a warning.
- **No fabrication / no publication:** the board renders only real persisted
  content and the real ledger (fixtures stay in the `/dev` preview, clearly
  labelled); nothing publishes.

## 6. Test results (exact counts, by kind)

| Suite | Kind | Result |
|---|---|---|
| `npm run typecheck` | static | **PASS** |
| `npm run lint` | static | **PASS** |
| `npm test` | **mocked/unit** (no DB) | **PASS — 335 passed, 4 skipped** (26 files; +16 new review-state tests) |
| `npm run test:db` | **real local PostgreSQL 16** | **PASS — 29 files, 478 assertions, 0 failed** |
| `npm run test:e2e` | browser, production build | **PASS — 94 passed, 72 skipped** (incl. editorial 404 gating for `/admin/editorial`, `/dev/editorial`, `/dev/editorial-auth`) |
| `npm run build` | build | **PASS** |
| `npm run check:hygiene` | static | **PASS — 400 tracked files** (pre-commit count) |
| Dev gallery accessibility (axe, dev build) | **browser (Playwright)** | **0 violations** on `/dev/ui`, `/dev/media`, `/dev/editorial`, `/dev/editorial-auth` at 412px + 1280px |

The 72 skipped e2e are the long-standing live-service tests (blocked on the anon
key), unchanged by this phase.

## 7. Known limitations

- **Interactive Playwright of the live board** (sign-in → record → see state change)
  needs an auth service + the hosted DB and is **blocked** (no anon key here). The
  authenticated component is covered by: unit tests of its logic, an axe-verified
  dev-build render of its markup, and the production 404 gating. Decision/quorum
  behaviour is proven at the database by case `280`.
- **Concurrency** is handled by the DB advisory lock (verified empirically in
  10.9A); the single-transaction DB harness cannot reproduce multi-session races as
  a committed assertion, so that evidence stays in the 10.9A report.
- The review-state derivation favours the **latest decision on the current
  revision**; a genuine split (e.g. one approve + one reject on the same revision)
  surfaces as the latest decision's state — acceptable for triage, and the full
  ledger is always shown.

## 8. Git status and commit information

- Started from a **clean working tree** at `92ac9cd`; no pre-existing uncommitted
  changes to preserve.
- Work committed locally on `claude/gallant-mendel-xey567`. **Not pushed** —
  per this phase's safeguard, remote push awaits explicit owner approval. (Commit
  hash recorded in the chat summary / `git log`.)

## 9. Hosted acceptance tasks still blocked by login

Unchanged from the Phase 10.11A preflight, and none are claimed here:
1. **Anon key** absent in this session (hosted REST → 401) → no signed-in run.
2. **Administrator browser session** unverified (magic-link rate-limited, per the
   owner); needed to confirm `/admin/editorial` renders for the real admin.
3. **Second distinct staff reviewer** must exist for the high-impact two-person
   test.
4. **Originals seed** presence on hosted dev must be confirmed (seed ≠ migration).
5. The acceptance plan (tests 5–10 = owner-authorised writes) in
   `docs/VSHARES_PHASE10_11A_HOSTED_READINESS.md` is still the gate for hosted
   sign-off.

## 10. Recommended Phase 10.13 plan

1. **Once the admin can sign in** (magic-link limit cleared): run the 10.11A
   acceptance plan on hosted dev — reviewer A/B sign-in, one real persisted
   decision, duplicate rejection, two-person quorum, revision invalidation, audit
   integrity, publication-locked.
2. **Add an authenticated Playwright path** that runs against a seeded local
   Supabase (or a test auth shim) so the live board's sign-in → record → state
   transition is covered in CI, not only by unit tests + axe.
3. **Bulk/queue ergonomics:** saved filter presets and a per-reviewer "my queue"
   summary count, building on the pure `matchesFilters`.
4. **Wire approved-and-eligible → the existing `moderate_content` publish path**
   (still owner-gated, publication a separate explicit action) — the first step
   that actually publishes, to be designed under its own approval.

**Restrictions honoured:** no live publication · no automatic approval · no
fabricated reviewers · no RLS bypass · no secrets · no destructive DB ops · no
hosted writes/migrations · no remote push · existing changes preserved.

**STOP for owner review.**
