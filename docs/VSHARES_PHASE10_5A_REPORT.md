# VSHARES — Phase 10.5A: production feed integration (local-first)

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- **What this is:** the real `/learn` route can now render approved multimedia
  alongside cards when such data exists, with a server-side `listApprovedMedia`
  read, a safe fallback when none exists, and the five videos prepared for human
  review. **No remote DB write, no remote migration, no content published, no
  live write test, no RLS weakening, no automatic approval, no secret.**

## Task 2 — approved-media read path
`listApprovedMedia` (`src/modules/feed/repository.ts`, exported via
`src/modules/feed/server.ts`) reads `content_media` through the **ordinary
request client** — so RLS does the gating (published media whose parent card is
readable; never unpublished/rejected; **no service-role bypass**). It returns
`[]` on any error, including when **migration 9 is not applied** (missing-schema
fallback), classified by the pure `isMissingMediaTableError`. Signed-out and
signed-in visibility, and server-write-only, are proven by
`supabase/tests/cases/270_content_media.sql`.

## Task 3 — public learning feed
`/learn` fetches approved media server-side and renders `LearnMediaSection`
(`MediaFeed`) **below** the value session. **Preserved existing behaviour:** when
there is no approved media (the current reality, and when the schema is absent),
the section renders **nothing** — `/learn` is unchanged. Media is VAI-ranked
(`rankMedia`, platform stats zero → never ranked by views/likes), shows learning
objectives and creator attribution, is responsive, never autoplays, and makes no
third-party request until a player is placed. **Fixtures are never exposed as
published content** — the feed reads only `content_media` published rows.

## Task 4 — real licensed image (Openverse)
The adapter requests JSON and validates reuse rights. A live fetch confirmed
Openverse returns real CC-licensed images with licence + creator + source
(verified manually), but the **anonymous tier burst-throttles** (it answers 200
with an HTML interstitial). The adapter now **detects the non-JSON throttle page
and reports it honestly** (BLOCKED); it never fabricates an image. The recorded
run is in `docs/samples/media/licensed-image.json`. The feed image card remains a
**labelled placeholder**. A registered Openverse API token (owner-provided) would
make live access reliable.

## Task 5 — editorial preparation
`docs/VSHARES_MEDIA_EDITORIAL_INVENTORY.md` now states a **five-stage gate**:
(1) metadata verified ✓, (2) embedding eligibility checked ✓ — **both via
oEmbed** — and (3) educational claims fact-checked, (4) editorial approval, (5)
publication authorised — **all NOT DONE**. No candidate advances to approval
merely because oEmbed returned metadata.

## Task 6 — migration readiness
`docs/VSHARES_MIGRATION_9_CHECKLIST.md`: review (least-privilege grants — select
only; RLS correctness; parent-content visibility; indexes/constraints; clean
rollback; additive compatibility; correct ordering) and an **exact owner-approval
checklist** for applying migration 9 to the remote dev project. **Not applied.**

## Task 7 — tests
- **Unit** (`tests/unit/feed/media-view.test.ts`, 7): missing-schema fallback
  classification; mixed-format mapping; attribution/licence preservation; a
  malformed provider id is skipped (not a crash); empty feed fallback.
- **DB** (`270_content_media.sql`, 7 assertions): published-only delivery,
  draft/rejected exclusion, cross-user isolation, **parent-card visibility**
  (published media on a draft card stays hidden), staff access, server-write-only
  (insert and update refused).
- **E2E:** `/dev/media` 404 in production; existing `/learn` journeys unchanged
  (unconfigured path short-circuits before the media fetch).
- **Accessibility:** axe on `/dev/media` — **0 violations** at 412px and 1280px.

| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 300 passed, 3 skipped** (live tests), 23 files |
| `npm run test:db` | **PASS — 27 files, 457 assertions, 0 failed** |
| `npm run test:e2e` | **PASS — 92 passed / 72 skipped / 0 failed** |
| `npm run build` | **PASS** |
| `npm run check:hygiene` | **PASS — 361 tracked files** |
| Gallery/media axe | **0 violations** (`/dev/ui`, `/dev/media`, both viewports) |

## Files changed
`supabase/migrations/20261118120000_content_media.sql` (+objective),
`supabase/tests/cases/270_content_media.sql` (+parent visibility),
`src/modules/feed/repository.ts`, `src/modules/feed/server.ts`,
`src/modules/feed/media-errors.ts` (new),
`src/components/feed/media-view.ts` (new), `src/components/feed/media-section.tsx` (new),
`src/app/(app)/learn/page.tsx`, `src/factory/live/http.ts` (accept option),
`src/factory/media/images.ts` (JSON accept + throttle detection),
`tests/unit/feed/media-view.test.ts` (new),
`tests/integration/media-demo.test.ts` (+licensed-image),
`docs/` (editorial inventory 5-stage, migration-9 checklist, this report, sample).

## Remaining blockers
1. Migration 9 not applied remotely (owner decision; checklist provided).
2. No approved media published → `/learn` renders cards only (correct fallback).
3. Openverse anonymous throttling → a token is needed for reliable live images.

## Phase 10.5B proposed actions (owner-gated)
1. Apply migration 9 on the dev project (per the checklist).
2. Human review + approve the five videos through `moderate_content` into
   `content_media` (the first multimedia publish; second reviewer where flagged).
3. Approve one Openverse image (with a token) into `content_media`.
4. Verify the live `/learn` feed renders the approved media, then consider
   interleaving media into the value session itself.

**Success criterion met:** `/learn` can safely render approved multimedia
alongside cards when suitable data exists, with approved-only delivery
(RLS + server-write-only), a safe fallback when none exists, and all existing
moderation, security and learning behaviour preserved. **STOP for owner review.**
