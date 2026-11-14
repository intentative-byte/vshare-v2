# VSHARES — Pull Request and Branch Disposition Report

- Date: 2026-11-14 · Repository: `intentative-byte/vshare-v2`
- Nothing has been merged, closed or deleted. All branches are retained. Actions below are **recommendations awaiting owner approval**.

## Summary

| PR | Branch | State | Size vs its base | Recommendation |
|---|---|---|---|---|
| #1 Build VShare v2 foundation | `cursor/vshare-v2-foundation-b385` | open | separate rebuild, 2 commits | Close without merging; keep branch as reference |
| #2 Rebuild VShare v2 Next.js app | `cursor/rebuild-vshare-v2-069e` | merged | — | No action; branch can be kept or deleted (fully in `main`) |
| #3 Prepare Render deployment config | `cursor/render-deployment-readiness-ff8e` | open | 4 files, +29 −4 | Close as superseded |
| #4 Add safe env diagnostics | `cursor/safe-env-diagnostics-0c16` | open | 8 files, +86 −11 | Close without merging; idea carried forward differently |
| #5 Make Supabase optional for demo deployment | `cursor/optional-supabase-demo-791a` | open | 35 commits, 140 files under `lib/` | Close without merging; keep branch as concept archive |
| #6 Remove internal demo copy from live UX | `cursor/remove-internal-demo-copy-fd7e` | merged | — | No action |
| #7 Add cleaned DAX GOLD PLUS v7 script | branch no longer on remote | merged | — | Content removed on the rebuild branch; see `VSHARES_SECURITY.md` SEC-2026-001 |

## PR #1 — foundation rebuild (reference material)

What it is: an independent rebuild with a normalised schema and server-side ranking. Cannot be merged — it conflicts with `main` in every file and uses a different layout, auth method (email + password) and file structure.

Carried into the new design:

| From PR #1 | Where it went |
|---|---|
| `topics` as rows; `user_topic_preferences` with weights | `topics`, `user_topics.affinity` (data model §A1–A2) |
| `content_memory` (viewed / skipped / saved / liked per user and item) | `content_interactions` |
| Append-only `content_events` | `analytics_events` with a fixed vocabulary |
| `adjust_topic_weight()` clamped weight updates | Learned-affinity moving average (architecture §6) |
| `get_feed_items()` — anti-join on seen items, ordered by match, weight, popularity, recency, quality | Two-stage ranker: SQL candidates + pure scoring function |
| Zod validators, uniform API response helper | Request pipeline and result envelope |
| `/api/health`, env schema | `/api/health`, `/api/ready`, validated env |
| Black/gold palette in `globals.css` | Starting point for the design tokens |
| Cursor pagination, abortable fetches, mobile bottom nav + desktop sidebar | API conventions; app shell |

Not carried: email + password auth (owner chose magic link + Google); scoring inside one large SQL function (moved to a unit-testable function); "no random fallback" rule replaced by an explicit, labelled discovery slot.

## PR #3 — Render deployment config

Contents: sets `start` to `next start -p ${PORT:-3000}`; changes `render.yaml` build command to `npm run build` (dropping the install step) and start command to `npm start`; adds comments to `.env.example`; expands the README's deployment section.

Relevance: **superseded.** `main` already binds the port (commit `ddc0979`, `next start -H 0.0.0.0 -p ${PORT:-3000}`), which is the more complete fix. Dropping the install step from the build command would be a regression on a clean build environment; the rebuild branch now uses `npm ci && npm run build`. The README text describes the legacy app and will be rewritten.

Nothing further to carry forward.

## PR #4 — safe env diagnostics

Contents: `GET /api/env-check` returning whether Supabase variables are set, the URL's length and shape flags, and the configured site URL; a URL-shape validator used before creating Supabase clients; clearer "not configured" errors.

Relevance: **the need is real, the approach is not kept.**
- Kept as an idea: validate configuration shape before use. In the rebuild this is `platform/env.ts` — a Zod schema checked at boot that stops the app from starting with bad configuration, instead of running in a degraded mode.
- Not kept: a public, unauthenticated endpoint that describes deployment configuration. It leaks operational detail for no user benefit; `/api/ready` returns only ready / not ready, and details go to server logs.
- Not kept: continuing to render demo data when configuration is invalid.

## PR #5 — "V3–V20" engines (concept archive)

What it is: 35 commits adding about 140 modules that compute scores and recommendations from a single object in browser `localStorage`. The branch's own `docs/product-readiness.md` states the outputs are deterministic local heuristics, the market graph is static, collective intelligence is derived from one user's local state, and persistence is disconnected. No code is carried forward.

Concepts preserved, mapped to the roadmap:

| Concept on the branch (paths under `lib/`) | What it was reaching for | Home in the new architecture | Target |
|---|---|---|---|
| `feed-ranking`, `content/scoring`, `content/diversity`, `feed-engine` | Multi-signal ranking with a discovery lane and repeat penalties | `vai` ranker v1; discovery slot; repetition window | **MVP** |
| `memory/session-memory`, `calibration/interest-scores` | Remembering position, last topic, learned interest | `content_interactions`, `user_topics.affinity` | **MVP** |
| `content/saved-library`, `engagement/actions` | Save, like, skip, not interested | `progress` module | **MVP** |
| `contributions/normalize`, `quality/submission-quality`, `trust/trust-scores` | User submissions with quality checks | Moderated submissions; editorial quality score | **MVP** (human moderation), R3 (automated signals) |
| `analytics/*`, `health/system-health` | Product analytics, content health | `analytics` module | MVP → R3 |
| `vai/orchestrator`, `vai/modes`, `recommendations/next-actions`, `vai-decision` | One unified user state and a single next action | `vai` Next Best → Next Best Move | MVP → R2 |
| `missions/daily-mission`, `milestones`, `momentum`, `retention/weekly-recap` | Daily mission, milestones, gentle consistency | `learning` quests; `progress` | R2 |
| `paths/learning-paths`, `progression/*`, `roadmaps`, `adaptive-roadmaps` | Structured progression | `learning` paths | R2 |
| `mastery/*`, `capability/*`, `gaps/gap-engine`, `knowledge-graph` | Skills, mastery, gaps | `learning` skills and mastery records | R2 |
| `outcomes/*`, `evidence`, `execution`, `attribution`, `reviews` | Recording real-world outcomes and evidence | Applied Learning | R2 (self-reported), later (verified) |
| `growth/*`, `velocity`, `roe`, `compounding` | Growth score | Value score with visible components | R2 |
| `goals/*`, `goal-health`, `north-star`, `planning`, `strategy/*`, `focus`, `constraints`, `bottlenecks`, `leverage`, `opportunity-cost`, `allocation`, `resources`, `economy`, `projects` | Goals, planning and trade-offs ("Life OS", "personal economy") | Goals in `personalisation`; planning features need their own spec | R2 (goals), Expansion (rest) |
| `digital-twin/*`, `state/*`, `identity`, `trajectory`, `future-state`, `futures`, `projections`, `scenarios`, `simulation` | A model of the user and projections of their future | User DNA (factual, inspectable). Projection and simulation are **not planned**: they would present speculation as insight, which the product rules forbid without evidence | R2 (User DNA); rest unscheduled |
| `decisions/*`, `history`, `patterns/decision-patterns`, `reasoning`, `risk`, `governor`, `governance`, `operator`, `drift`, `dependencies`, `optimization`, `autonomous-growth` | Decision support and self-governing recommendation loops | VAI mentor (grounded) and platform intelligence loop | R2–R3, each needing a spec |
| `creators/*`, `media/*`, `reputation` | Creator profiles, media rendering, reputation | `creators` module | R3 |
| `collective/*`, `community-intelligence/*`, `community/signals`, `network/*`, `patterns/collective-patterns`, `playbooks/*`, `matching` | Community and network intelligence | Social learning; requires real multi-user data | R3+ |
| `market/*`, `demand`, `career`, `business-intelligence`, `opportunities` | Skills-to-market and opportunity matching | Opportunity discovery; requires real, traceable sources | Expansion |
| `notifications/framework` | Notification intents | Retention intelligence (consent-based) | R3 |
| `docs/first-user-test-plan.md` | Manual first-user script | Basis for the M-01 E2E test and the pilot test plan | **MVP** |

## Requested approvals

1. Close PRs #1, #3, #4 and #5 with a comment linking to this report, keeping their branches.
2. Optionally delete the two fully merged branches (`cursor/rebuild-vshare-v2-069e`, `cursor/remove-internal-demo-copy-fd7e`).

No action will be taken on either without explicit approval.
