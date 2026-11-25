# VSHARES — Phase 10.10 report: Authenticated Editorial Workbench Activation

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- Turned the Phase 10.8 browser-only prototype into an **authenticated,
  database-backed** human editorial review surface at `/admin/editorial`, wired to
  the append-only governance ledger (migrations 10 & 11). **No content published,
  no automatic approval, no RLS weakened, no service-role bypass, no remote
  writes.**

## Honest status up front

- **Local verification: complete and green** (local PostgreSQL, unit, e2e, build,
  axe) — see Task 9.
- **Hosted-development runtime verification: BLOCKED.** This session has the dev
  project URL (`apgchptregdpswiwmyua` = `vshare-development`) but **no anon key and
  no service-role key** (both empty in `.env.local`, none in the environment).
  REST and auth return **401**. So no reviewer can be signed in here and no live
  click-through against hosted dev was possible. This is a credentials blocker, not
  a defect, and per the directive I did **not** invent identities or bypass auth.

## Task 1 — hosted development readiness (read-only)

- Project URL present; **anon key and service-role key absent** in this session.
  Hosted REST `/rest/v1/content_items` → **401**; `/auth/v1/health` → **401**.
- The governance schema itself is verified against **real PostgreSQL** by the DB
  test suite (case `280`, 15 assertions) and was confirmed byte-for-byte in the
  Phase 10.9A acceptance; the owner confirms all 11 migrations are applied on the
  hosted dev project. I could not independently re-confirm the hosted catalog or
  reviewer roles at runtime without a key.
- **Blocker to clear before go-live:** add the dev **anon key** to the session/app
  env, and grant **moderator/admin** to at least two distinct human reviewer
  accounts (the two-reviewer rule needs two). No reviewers can be enumerated from
  here.

## Task 2 — authenticated reviewer interface

- `/admin/editorial` is now a **server component** gated by the existing admin
  layout (`readViewer()` → `notFound()` for non-staff; `notFound()` when no DB is
  configured). It shows the **signed-in reviewer's identity** (display name, role,
  short id) read server-side from `readMyProfile()`.
- **Manually entered reviewer identity is gone** from the authoritative workflow;
  identity comes only from the authenticated session.
- `/dev/editorial` remains the clearly-labelled **simulation** (localStorage), and
  a new `/dev/editorial-auth` is an **accessibility preview** of the authenticated
  component in a non-persisting "preview" mode. Both dev routes are **404 in
  production** (asserted in `security-headers.spec.ts`).

## Task 3 — real editorial decisions

- The workbench calls the authenticated action **`content.recordEditorialDecision`**
  (pipeline: rate-limit → authenticate → authorise `moderator` → validate →
  execute → record). Decisions: **Approve · Request revision · Reject · Escalate**.
- **Rationale is required** (Zod min 10 chars, server-enforced). **Identity and
  timestamp are database-controlled** (`app.current_user_id()`, `now()`), never
  from the browser.
- Clear confirmation (`role="status"`, `aria-live`) and error handling (duplicate
  approval → "You have already approved this revision"; non-staff → forbidden).
  The UI never claims persistence it did not get: it reports only what the server
  returned, and `router.refresh()` re-reads the ledger.

## Task 4 — independent second review

- High-impact content requires **two distinct authenticated reviewers**; the
  required count and the distinct-approver count are shown. **Final eligibility is
  read from the server** (`editorial_publication_eligible`) and never computed in
  the browser.
- A reviewer **cannot approve the same revision twice** (DB enforces; the UI also
  reflects "already approved"). Case `280` proves same-account double approval is
  refused and that two distinct reviewers are needed.

## Task 5 — immutable revision binding

- The **exact revision** under review is displayed (`current_version_id`), and every
  decision binds to it. Each ledger entry is marked **current** or **superseded**;
  when content has changed, the panel states that **earlier approvals no longer
  establish eligibility** (DB invalidates them — case `280`).

## Task 6 — audit history

- The panel renders **authoritative decisions from PostgreSQL** (reviewer id,
  decision, rationale, server timestamp, bound revision, per-revision status, and
  server-computed eligibility), read through **RLS staff-only** policies.
- The real ledger is **completely separate** from the `/dev` localStorage
  simulation — different components, no shared storage. A broken hash chain
  (`editorial_ledger_valid = false`) is surfaced as a warning.

## Task 7 — Originals integration (honest)

- The authoritative board reads **only real persisted `content_items` + their
  immutable `content_versions`**. It does **not** render the TS fixtures and does
  **not** imply fixtures are published or reviewable. When no content awaits
  review, it says so plainly.
- Content lacking evidence verification is flagged (**source link not checked → "a
  human must check the source"**). Multimedia metadata is explicitly **not**
  presented as factual verification.

## Task 8 — security & accessibility

| Check | How verified | Result |
|---|---|---|
| Anonymous access denied | e2e: `/admin/editorial` → 404 | **PASS** |
| Ordinary user access denied | admin layout role gate + action `access:"moderator"` + DB `is_staff()` (case `280`: non-staff refused) | **PASS (local/DB)** |
| Authorised reviewer access | server action + layout; DB `280` records as staff | **Verified local/DB**; live sign-in blocked (no key) |
| Duplicate reviewer rejection | DB `280`: same reviewer can't approve a revision twice | **PASS** |
| Stale/foreign revision rejection | DB `280`: revision must belong to content; new revision invalidates prior approvals | **PASS** |
| Cross-user permission boundaries | RLS staff-only SELECT on `editorial_decisions`; `280` + suite | **PASS** |
| Database error handling | repository reads return `[]` on error / missing schema; action maps errors to safe messages; empty-state UI | **PASS (code + types)** |
| Mobile responsiveness | axe at 412px on `/dev/editorial-auth` | **0 violations** |
| Keyboard accessibility | native `SelectField`/`TextArea`/`TextField`/`Button`/`details` | **0 axe violations** |
| Screen-reader labels | labelled fields, `aria-label` forms, `role="status"` `aria-live` | **0 axe violations** |

Live signed-in reviewer click-through (duplicate/stale **through the UI**) needs an
auth service + the hosted DB and is blocked on the missing anon key; the
underlying rules are proven at the database by case `280`.

## Task 9 — verification (distinguishing test kinds)

| Check | Kind | Result |
|---|---|---|
| `npm run typecheck` | static | **PASS** |
| `npm run lint` | static | **PASS** |
| `npm test` | mocked/unit (no DB) | **PASS — 319 passed, 4 skipped** |
| `npm run test:db` | **real local PostgreSQL 16** | **PASS — 29 files, 478 assertions, 0 failed** (incl. `280` governance, `290` hardening) |
| `npm run test:e2e` | browser, production build (no DB) | **PASS — 94 passed, 72 skipped** (incl. editorial 404 gating + new `/dev/editorial-auth`) |
| `npm run build` | build | **PASS** |
| `npm run check:hygiene` | static | **PASS — 394 tracked files** |
| Dev gallery accessibility (axe) | browser | **0 violations** on `/dev/ui`, `/dev/media`, `/dev/editorial`, `/dev/editorial-auth` (412px + 1280px) |
| **Hosted dev runtime** | hosted | **BLOCKED — no anon key (401)** |

The 72 skipped e2e are the long-standing live-service tests (blocked on the anon
key), unchanged by this phase.

## Task 10 — delivery

1. **Features:** authenticated `/admin/editorial` (server-rendered real content +
   ledger), four decision types with required rationale via the authenticated
   action, server-set identity/timestamp, two-distinct-reviewer status, immutable
   revision binding with superseded-approval warnings, DB audit history, honest
   empty/evidence states, dev accessibility preview.
2. **Security controls:** staff-only layout gate; `access:"moderator"` action;
   DB `is_staff()` + server-set identity; RLS staff-only ledger reads; no browser
   DB access; no service-role use in the review path; eligibility server-computed;
   publication kept separate; dev routes 404 in prod.
3. **Database integration:** reads via RLS request client (`listEditorialReviewItems`,
   `listEditorialDecisions`, `editorial_publication_eligible`,
   `editorial_ledger_valid`); writes via `record_editorial_decision`. Verified on
   local PostgreSQL; **hosted dev runtime unverified (no key).**
4. **Test evidence:** above (static, mocked, local-DB, e2e, build, hygiene, axe).
5. **Outstanding blockers:** (a) **anon key** absent → no hosted runtime
   verification and the app cannot authenticate anyone here; (b) **≥2 moderator/admin
   reviewer accounts** must be granted on dev; (c) seed `supabase/seed/020_cards_batch_1.sql`
   must be present on dev for the board to show the Originals (unverifiable from here);
   (d) source links still need checking before any publication.
6. **Screenshots:** `docs/samples/authenticated-workbench-desktop.png`,
   `docs/samples/authenticated-workbench-mobile.png` (the `/dev/editorial-auth`
   preview, both viewports).
7. **Commit:** recorded in `VSHARES_PROGRESS.md` and the final chat message (this
   phase's pushed commit on `claude/gallant-mendel-xey567`).
8. **Next recommended phase (10.11):** with the anon key provided and two reviewers
   granted on dev, run a **hosted dev acceptance**: sign in as each reviewer, record
   a real decision on a seeded draft, confirm the two-reviewer quorum and
   revision-invalidation end-to-end, and confirm the ledger from the DB — then wire
   the approved-and-eligible path to the existing `moderate_content` publication
   step (still owner-gated), keeping publication a separate explicit action.

## Non-negotiable restrictions — honoured

No automatic publication · no automatic approval · no RLS weakening · no
service-role bypass for review · no fabricated reviewers/approvals · no remote
writes · no new remote migration · no production deployment · no merge · no
credential exposure.

**STOP for owner review.**
