# VSHARES — Phase 10.13 T6 + T7 report

- **Date:** 2026-11-21 · **Branch:** `claude/gallant-mendel-xey567`
- Local only. No hosted write, no migration, no publication, no approval, no RLS
  or role change. Existing governance and RLS preserved.

## T6 — Batch-1 editorial workbench integration

### Evidence status of the ten Batch-1 Originals (not assumed fact-checked)

The batch-1 cards (`supabase/seed/020_cards_batch_1.sql`) were inspected against a
local scratch database built from all 11 migrations + both seeds. **None is
treated as fact-checked.** The editorial-board contract, read directly:

| Property | Result (all 10) |
|---|---|
| Status | `draft` |
| Immutable current revision | present on every card |
| Source link checked | **no** (`link_checked_at` null) → shown as "not verified" |
| Publication-eligible (`editorial_publication_eligible`) | **false** |
| Editorial decisions recorded | **0** |
| High-impact (need two reviewers) | **3** — budget, sleep, scams |

Each card has a real reputable source (NHS, GOV.UK, ICO, NCSC, National Careers
Service, Google ML, etc.). **Suitability for editorial review:** all ten are
well-formed drafts suitable to *enter human review*; **none is verified or
publication-ready**, and per-claim evidence concerns remain in the human review
pack (`docs/VSHARES_ORIGINALS_REVIEW_PACK.md`). The three high-impact cards require
an independent second reviewer.

### Integration verified at the layer that is runnable here

The workbench at `/admin/editorial` already reads this data (Phase 10.10/10.12:
`listEditorialReviewItems`, `listEditorialDecisions`, `editorial_publication_eligible`,
`editorial_ledger_valid`, all through RLS). The read contract those rely on is now
proven against real PostgreSQL by **`supabase/tests/cases/310_editorial_board_contract.sql`**
(9 assertions): a staff reviewer sees the drafts; each has a current revision;
every one is link-unchecked, not eligible, with no decisions; a recorded decision
appears in the ledger; **a non-staff account sees neither the draft board nor the
ledger** (RLS). The UI mapping and accessibility are covered by the existing unit
tests and axe checks.

**Honest boundary:** rendering those rows *in the browser* needs PostgREST + Auth
(a local Supabase stack), which is not available in this container (see T7). The
data contract is fully verified; the live browser render of batch-1 is the one
piece that needs the local stack.

## T7 — Authenticated editorial end-to-end tests

`tests/e2e/editorial-authenticated.spec.ts` (+ `tests/e2e/support/local-supabase.ts`)
is a repeatable Playwright suite covering all nine required scenarios against a
**real local Supabase** stack, with explicit labelled local-only identities
(`e2e-admin-a@vshares.local`, `e2e-moderator-b@vshares.local`,
`e2e-ordinary@vshares.local`). It never touches hosted Supabase, never bypasses the
app's authorization, and never fabricates a decision.

Scenarios: admin access · moderator access · non-staff 404 · draft visibility +
revision binding · record a decision + audit persistence · high-impact two-distinct
-reviewer quorum · duplicate rejection · stale/superseded revision · session-expiry
without false success.

### Status in this environment: SKIPS (local stack unavailable)

This container has **no Docker, no Supabase CLI, no PostgREST/GoTrue**, so the
suite **skips cleanly** (gated on `E2E_LOCAL_SUPABASE=1` + local URL/keys) — it
cannot produce a false pass. Run instructions and the per-scenario mapping to the
DB tests that prove the same server-side rules are in
`docs/VSHARES_T7_LOCAL_EDITORIAL_E2E.md`. The nine scenarios' governance is already
proven on real PostgreSQL by cases `280` (quorum, duplicate, revision
invalidation, append-only ledger), `300` (draft-only, gates), and `310` (board
read + RLS).

## Quality gates (exact; local / mocked / hosted distinguished)

| Gate | Kind | Result |
|---|---|---|
| `npm run typecheck` | static | **PASS** |
| `npm run lint` | static | **PASS** |
| `npm test` | mocked/unit | **PASS — 382 passed, 5 skipped** (31 files) |
| `npm run test:db` | **real local PostgreSQL** | **PASS — 31 files, 497 assertions, 0 failed** (incl. new `310`) |
| `npm run test:e2e` | browser (production build, no DB) | **PASS — 94 passed, 90 skipped** (the 9 authenticated tests skip without the local stack; never fail) |
| `npm run build` | build | **PASS** |
| `npm run check:hygiene` | static | **PASS — 419 tracked files** |
| Dev gallery accessibility (axe) | browser | **0 violations** (`/dev/ui`, `/dev/media`, `/dev/editorial`, `/dev/editorial-auth`) |
| **Hosted verification** | hosted | **NONE** — no anon key / no admin sign-in; not claimed |

## Remaining blockers

- **Local Supabase stack** (Docker/CLI/PostgREST/GoTrue) is unavailable here, so the
  T7 browser suite and the live batch-1 render cannot execute in this container.
- **Hosted acceptance** remains blocked on the anon key and the admin's magic-link
  sign-in.
- **Batch-2 content** is still not review-eligible (T4b): nothing changed that.

## Recommended next steps

- **T4c (evidence recovery, human-led):** rewrite batch-2 takeaways to match what
  reputable sources actually say (grounded in the per-claim passages the T4b
  classifier surfaced) and replace the 9 inaccessible sources; re-run the factory.
  Only then do batch-2 candidates earn a `queue` score.
- **Hosted editorial acceptance:** once the admin can sign in and the anon key is
  set, run the T7 suite against the dev project's local mirror or follow the
  `VSHARES_PHASE10_11A_HOSTED_READINESS.md` acceptance plan on hosted dev
  (owner-authorised writes only).
- **Batch-1** is ready for *human* editorial review now (draft, sourced,
  not-yet-verified); it is the right content to drive the first real review once a
  reviewer can sign in.
