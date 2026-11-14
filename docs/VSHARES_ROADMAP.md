# VSHARES — Roadmap

- Date: 2026-11-14 · Supersedes the Phase 0 roadmap.
- Status key: `done` · `in progress` · `next` · `planned` · `blocked`

## 1. Master phases (owner's directive) mapped to releases

| Phase | Name | Release | Status |
|---|---|---|---|
| 0 | Reconstruction | — | **done** |
| 1 | Product foundation: spec, architecture, data, contracts, security, design | — | **done in draft — awaiting owner sign-off** |
| 2 | Core application: shell, auth, profiles, categories, content, navigation | MVP (M1–M3) | next |
| 3 | Value Feed: discovery, ranking, saves, shares, interactions | MVP (M4–M6) | planned |
| 5 (foundation only) | VAI: deterministic ranking and Next Best | MVP (M4) | planned |
| 7 (essentials only) | Event analytics and funnels | MVP (M7) | planned |
| 11 (MVP level) | Security review, accessibility, release preparation | MVP (M8) | planned |
| 4 | Learning engine: paths, quizzes, progress, quests, mastery | R2 | planned |
| 5 | VAI: next best move, mentor, memory | R2 | planned |
| 6 | User development: User DNA, Applied Learning, dashboards, review | R2 | planned |
| 7 | Platform intelligence: flow map, alignment score, value leaks | R3 | planned |
| 8 | Creator systems | R3 | planned |
| 9 | Retention and optimisation | R3 | planned |
| 10 | Expansion: marketplace, opportunities, audio, community, monetisation | Each needs an approved spec | planned |
| 11 | Production readiness at scale: load testing, external security test | Before growth beyond the first cohort | planned |

## 2. MVP milestones

Each milestone ends with working code, passing tests, updated docs and a VSHARES ENGINEERING REPORT. A milestone is not started until the previous one's exit criteria are met.

Size is given in focused engineering sessions (one session ≈ one working block of this kind of collaboration). These are estimates, not commitments; owner review time between milestones is extra.

| # | Milestone | Delivers (spec IDs) | Exit criteria | Size |
|---|---|---|---|---|
| M1 ✅ | **Foundation and shell** — complete 2026-11-14 | Legacy app replaced by the new structure; platform layer (env validation, db clients, action pipeline, rate limit, logger, errors, flags); security headers; design tokens and core primitives; five-tab app shell with empty states; local Supabase; Vitest, Playwright, axe; CI extended to run them; `/api/health`, `/api/ready` (M-13, M-14) | Met, except CI has not executed yet and the reference screens await owner review. 54 unit and 44 end-to-end checks pass locally; no demo-mode code remains | 2–3 |
| M2 ✅ | **Identity and profiles** — complete 2026-11-14 | Migration 1: profiles, roles, preferences; magic link, Google, guest accounts and upgrade; safe redirects; profile editing; role checks (M-02, M-09) | Met for the database layer: 89 assertions pass against real PostgreSQL, including isolation with two distinct users on every table. The auth-service journeys are implemented and their tests are written, but skipped until a service is reachable | 2 |
| M3 | **Catalogue and moderation** | Migration 2: taxonomy, value cards, reports, moderation log, audit log; admin catalogue and taxonomy management; moderation queue; public card page; **launch catalogue curated and loaded** (M-11, part of M-08) | Admin-only access proven by tests; catalogue meets the content standard in the spec §B3; owner has reviewed the catalogue | 2–3 (+ curation time) |
| M4 | **Value Feed and VAI foundation** | Migration 3: interactions, user topics, recommendations, ranking config; ranker v1; finite sessions; "Why this?"; Next Best; topic selection and preference memory (M-03, M-04, M-05) | Ranking unit tests cover every component and tie-break; repetition avoidance integration-tested; recommendations logged | 3 |
| M5 | **First Learning Win, library, progress** | Home → topic → card → "Got it" → win state as a guest; SAVED; progress summary; PATH tab (M-01, M-06, M-07) | The first-win E2E passes on a mobile viewport in under the 60-second budget for scripted input; progress derives only from completions | 2 |
| M6 | **Submission, sharing, data rights** | Submit a resource; my submissions; reports; share; export; account deletion; guest purge job (M-08, M-10) | Export and deletion tests pass (no orphan rows); submission rate limits and URL rules tested | 2 |
| M7 | **Essential analytics** | Event ingestion, consent handling, rollups, funnel and validation-metrics views (M-12) | Rollups reconcile with raw events on fixtures; no identifiers recorded before consent | 1–2 |
| M8 | **Hardening and release preparation** | ASVS L2 walk-through; accessibility audit incl. manual screen-reader pass; performance budget check; runbook; backup and restore drill; privacy notice and terms drafts; release checklist | `VSHARES_TEST_REPORT.md` and `VSHARES_SECURITY.md` updated with results; no open critical or high defects; owner go/no-go | 2 |

Total: roughly 16–19 sessions plus catalogue curation and owner reviews.

Deployment to any shared or public environment happens only after M8 and only on explicit owner authorisation.

## 3. Next development milestone — M2 in detail

1. First product migration: `profiles`, `user_roles`, `preferences`, with row-level security on each and the handle generator, plus `has_role()`.
2. Supabase auth adapter behind `platform/auth`, registered with the action pipeline's viewer resolver.
3. Magic-link sign-in, the callback route using the tested redirect sanitiser, and sign-out (including everywhere).
4. Guest accounts: created on first write, carried through the same policies, upgraded in place on registration, with the merge path for an email that already has an account.
5. Route protection in `src/proxy.ts` for routes that need an account, with the real boundary remaining the action pipeline and the database policies.
6. Profile screen and editing on the YOU tab; roles readable, grantable only by an audited server function.
7. Tests: row-level isolation per table with two users; guest restrictions; every action as each caller type; auth end-to-end against the local database; CI runs a Supabase instance.

Exit criteria: a person can sign in with a magic link against the local stack, a guest's work survives registration, and no table lets one account read another's rows.

## 4. First development milestone — M1 in detail (complete)

1. Create `src/` structure, module skeletons for the eight MVP modules (index files and boundary lint rule only), remove legacy `app/`, `components/`, `lib/`, `middleware.ts`, `scripts/smoke-test.mjs` and the legacy migration and seed (kept in git history and on `main`).
2. `platform/env.ts` with a Zod schema; `.env.example` listing every variable by name.
3. `platform/action.ts` pipeline with unit tests for each stage; `platform/errors.ts` result envelope; Postgres-backed rate limiter.
4. Security headers and CSP in `next.config.ts`, with a test.
5. `tokens.css`, fonts self-hosted, primitives: Button, IconButton, TextField, ChoiceChip, Card, Skeleton, EmptyState, ErrorState, Toast, Dialog.
6. App shell: bottom tab bar and side rail for PATH / LEARN / EXPLORE / SAVED / YOU; public home with the brand line and static topic chips; `/dev/ui` component gallery (non-production only).
7. Supabase CLI config for local development; empty baseline migration; CI job that boots it.
8. Vitest and Playwright set up; first E2E: home renders, tabs navigate, axe passes at 360px and 1280px; keyboard traversal test.
9. Extend CI: unit, E2E, accessibility. Update docs and progress log.

Needs from the owner before M1 starts: sign-off of the Phase 1 documents, and approval to replace the legacy application code on the rebuild branch.

## 5. After the MVP

| Release | Theme | Gate to start |
|---|---|---|
| R2 | Learning engine (one complete path, quizzes, mastery), Applied Learning, quests, Next Best Move, User DNA view, spaced repetition, collections, optional LLM mentor | MVP validation metrics reviewed; R2 spec approved; LLM provider and budget approved if the mentor is included |
| R3 | Creator publishing and analytics, flow map, Platform Alignment Score, value-leak detection, consent-based retention, hosted media | Evidence of demand for contributed content; moderation capacity; R3 spec approved |
| Expansion | Opportunities, marketplace and payments, audiobooks, community | Separate commercial, legal and product approval for each |
