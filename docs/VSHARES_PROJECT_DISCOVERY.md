# VSHARES — Project Discovery (Phase 0)

- Date: 2026-11-14
- Scope: everything reachable in `intentative-byte/vshare-v2` — the `main` branch, six unmerged `cursor/*` branches, seven pull requests, zero issues.
- Method: read every tracked file on `main`; read docs and sampled code on the unmerged branches; ran the project's own checks.

Every statement below is tagged by how it was established:
**[verified]** = executed or read directly, **[inferred]** = deduced from evidence, **[unknown]** = no evidence in the workspace.

---

## 1. Urgent: live credentials in a public repository

`DAX_GOLD_PLUS_v7_LEARNING_READY.py` (lines 18–19) hardcodes an Alpaca API key ID and secret key. **[verified]**
The repository visibility is **public**. **[verified]**

- The endpoint configured is Alpaca's paper-trading API, so the direct financial exposure is probably limited, but the key pair is a real credential and has been publicly readable since 2026-06-27 (commit `5db2911`, PR #7, plus branch `cursor/dax-cleanup-learning-ready-b873` if it still exists).
- **Action for the owner (cannot be done from here): regenerate the key pair in the Alpaca dashboard now.** Treat the old pair as compromised regardless of anything done to the repo.
- Removing the file from the tip does not remove it from history. A history rewrite or simply accepting the leak after rotation are both valid; that is an owner decision (see §9, Q7).
- Nothing has been deleted or rewritten in this phase.

## 2. What exists

### 2.1 `main` (48 tracked files)

| Area | Content |
|---|---|
| App | Next.js 16.2.9 App Router, React 19, TypeScript 6, Tailwind 4. Routes: `/`, `/login`, `/onboarding`, `/feed`, `/explore`, `/profile`, `/auth/callback`. |
| API | `GET/POST /api/posts`, `GET/PUT /api/profile`, `GET/PUT /api/preferences`. |
| Data | Supabase (Postgres + Auth). One migration: `profiles`, `preferences`, `posts`, `saved_posts`, RLS on all four, signup trigger. Seed with two example users. |
| Auth | Supabase magic link; GitHub OAuth behind a flag; a "demo mode" cookie. |
| Deploy | `render.yaml` (Render web service, free plan). |
| Tests | `scripts/smoke-test.mjs` — greps source files for required and forbidden marketing copy. No behavioural tests. No CI. |
| Unrelated | `DAX_GOLD_PLUS_v7_LEARNING_READY.py` (3,200-line Pythonista stock-trading bot for the Alpaca API) and `CLEANUP_NOTES.md` describing it. Not part of VShare in any way. |

Check results on `main`, run 2026-11-14 with Node 22 **[verified]**:

| Check | Result |
|---|---|
| `npm ci` | OK |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run test:smoke` | pass (copy grep only) |
| `npm run build` | pass |
| `npm audit` | **19 vulnerabilities — 1 critical, 8 high, 10 moderate** in the locked dependency tree |

Passing lint/type/build says the code compiles. It says nothing about whether the product works: there is no test that signs a user in, writes a row, or reads a feed. No part of the app has been verified against a real Supabase project in this session.

### 2.2 Unmerged branches (the most informative material)

| PR | Branch | State | What it contains |
|---|---|---|---|
| #1 | `cursor/vshare-v2-foundation-b385` | open | A *different* first rebuild: black/gold theme, email+password auth, a much better schema (`topics`, `user_topic_preferences`, `content_items`, `content_memory`, `content_events`), SQL functions for feed ranking and weight calibration, Zod validation, `/api/feed` with cursor pagination, `/api/health`, plus `docs/architecture.md` and `docs/roadmap.md`. |
| #2 | `cursor/rebuild-vshare-v2-069e` | merged | The rebuild currently on `main`. |
| #3 | `cursor/render-deployment-readiness-ff8e` | open | Render config tweaks. |
| #4 | `cursor/safe-env-diagnostics-0c16` | open | `/api/env-check` and Supabase URL validation. |
| #5 | `cursor/optional-supabase-demo-791a` | open | 35 commits labelled "V3"…"V20": **140 files / ~278 KB under `lib/`** — "digital twin", "life operating system", "market intelligence", "personal economy", "autonomous growth engine", etc. All state lives in browser `localStorage`; Supabase is disconnected. Its own `docs/product-readiness.md` states the outputs are "deterministic local heuristics", the market graph is static, and collective intelligence is derived from a single user's local state. Adds `/saved`, a bottom mobile nav, `/api/health`. |
| #6 | `cursor/remove-internal-demo-copy-fd7e` | merged | Marketing copy, demo-mode cookie, the copy-grep smoke test. |
| #7 | `cursor/dax-cleanup-learning-ready-b873` | merged | The unrelated trading script. |

There is no original "VShare v1" code, design file, brand asset, spec, or user research in the workspace. **[verified]** Whether any exists elsewhere is **[unknown]**.

## 3. What VShare was intended to be

Evidence, in the owner's own words (repo description and README, identical across branches):

> VShare v2 — A personalised learning and knowledge-sharing platform that delivers topic-specific content, remembers user preferences, adapts to behaviour, and turns scrolling into continuous growth. Built for speed, relevance, and long-term learning.

The consistent core across all three rebuild attempts **[inferred, high confidence]**:

1. A user picks topics they want to learn.
2. They get a scrolling feed of short learning content for those topics.
3. The product remembers what they saw, saved, liked and skipped, does not repeat it, and shifts topic weighting accordingly.
4. Users can contribute resources (links with a summary) for others.
5. Explore changes the active topic; Profile shows preferences and progress.

Recurring but less certain themes **[inferred, low confidence]**: daily missions / streaks, learning paths, creator profiles, goals and outcomes tracking, an assistant persona called "VAI".

Not established by any evidence **[unknown]**: the business model; the target audience; where content comes from at scale; whether "V" stands for something; whether the product name is "VShare" (all repo material) or "VSHARES" (the rebuild directive).

## 4. Worth preserving

| Item | Source | Why |
|---|---|---|
| Product one-liner and homepage copy ("Turn scrolling into growth.") | `main` | The only owner-approved product language (PR #6 enforced it by test). |
| Core loop: topics → feed → memory → calibration | PR #1 docs | Clear, small, testable; matches the description exactly. |
| Schema design: `topics`, `user_topic_preferences`, `content_items`, `content_memory`, append-only `content_events`, feed ranking in SQL | PR #1 `db/schema.sql` | Normalised, indexed, RLS on every table. Far closer to production shape than `main`'s `text[]` topics. Use as the starting point, not verbatim. |
| RLS-first authorisation, anon key only in the app | `main`, PR #1 | Correct model for Supabase; no service-role key is in the app. |
| Zod validation at the API boundary, uniform API response helper | PR #1 | `main` has neither. |
| Mobile bottom nav + desktop sidebar; `/saved`; `/api/health` | PR #1, PR #5 | Sensible shell decisions. |
| First-user test plan | PR #5 `docs/first-user-test-plan.md` | A ready-made E2E script for the core journey. |
| Feed ranking signal list (topic match, recency, saves, skips, diversity lane) | PR #5 `lib/feed-ranking` | Useful as a requirements checklist for the server-side ranker. The client-side code itself is not reusable. |
| Stack: Next.js + TypeScript + Tailwind + Supabase | all | Fits the product; see §7. |

## 5. Weaknesses, defects and debt on `main`

Severity: **H** = fix before any real user, **M** = fix in foundation, **L** = cleanup.

### Security

| # | Sev | Finding | Location |
|---|---|---|---|
| S1 | H | Hardcoded API credentials in a public repo (see §1). | `DAX_GOLD_PLUS_v7_LEARNING_READY.py:18-19` |
| S2 | H | Open redirect: `next` query param is passed to `new URL(next, origin)`; an absolute URL (`?next=https://evil.example`) redirects off-site after sign-in. Also no handling of a failed code exchange. | `app/auth/callback/route.ts:7-14` |
| S3 | H | Auth bypass by design: any visitor can set `vshare_demo_mode=1` and pass the route guard for all protected pages. Data is still protected by RLS and the APIs still check the user, so today this leaks only public posts — but it violates "never bypass authentication" and will leak the moment a protected page renders private data. | `middleware.ts:45-47`, `lib/demo.ts` |
| S4 | H | No input validation. Request JSON is type-cast, not checked: unbounded strings and arrays, arbitrary topic values, unvalidated URL scheme on user-submitted links, non-numeric `estimated_minutes`. Malformed JSON throws a 500. | `app/api/*/route.ts` |
| S5 | M | Raw database error messages returned to clients (schema/constraint disclosure). | `app/api/*/route.ts` |
| S6 | M | No rate limiting on any endpoint, including post creation and magic-link sending. | — |
| S7 | M | No security headers (CSP, HSTS, frame-ancestors, referrer policy). | `next.config.ts` |
| S8 | M | Every dependency is declared as `"latest"`. Builds are only reproducible via the lockfile, and `npm install` (which `render.yaml` uses instead of `npm ci`) can silently take new majors. 19 known vulnerabilities in the locked tree. | `package.json`, `render.yaml` |
| S9 | M | Seed file creates users with the password `password`. Safe locally; dangerous if ever run against a hosted project, which the README's "run in SQL editor" instruction makes easy to do by mistake. | `supabase/seed.sql` |
| S10 | L | All profiles (including interests) are world-readable, including to anonymous clients. May be intended; needs a privacy decision. | migration, "Profiles are public" |

### Correctness

| # | Sev | Finding | Location |
|---|---|---|---|
| C1 | H | Signup can fail outright: the trigger takes `user_name` from OAuth metadata as the unique `username`; a collision raises inside the trigger and aborts user creation. | migration, `handle_new_user()` |
| C2 | H | The "personalised" feed is not personalised. It returns the 24 newest posts for everyone. The "% match" badge is `98 − 4 × position`. Preferences are written but never read. | `lib/queries.ts:31-53` |
| C3 | M | `PUT /api/profile` is a full overwrite: omitting `headline` or `interests` nulls/empties them. | `app/api/profile/route.ts:63-70` |
| C4 | M | On any query error the feed silently shows hardcoded demo posts as if they were real. Unconfigured production would look "working". | `lib/queries.ts:38-40` |
| C5 | M | Dead or fake features: `saved_posts` has no UI or API; `/feed?topic=` links from Explore are ignored; Profile shows global posts, not the user's; demo onboarding reports "Preferences saved" and saves nothing. | various |
| C6 | L | Posts cannot be deleted by their author (no delete policy); no moderation or reporting path for user-submitted links. | migration |
| C7 | L | "Onboarding" is a permanent nav item; no sign-out control; no mobile navigation at all (`hidden md:flex`). | `components/AppShell.tsx` |

### Engineering

- No behavioural tests, no CI, no pre-merge checks. The one "smoke test" asserts marketing strings exist in source files.
- No error boundaries, `loading`/`error`/`not-found` states, or logging.
- No environment validation; missing config degrades to demo data rather than failing.
- No accessibility pass: unlabeled inputs in the post form, toggle chips without `aria-pressed`, status messages not announced.
- Next 16 has renamed `middleware` to `proxy`; the current file uses the deprecated convention.
- Render free plan sleeps when idle (cold starts of tens of seconds); unsuitable beyond a demo.
- Three divergent rebuilds exist with incompatible schemas, auth methods and visual identities (violet/light on `main`, black/gold in PR #1).

## 6. Redesign rather than reuse

| Component | Verdict |
|---|---|
| PR #5 "V3–V20 engines" (140 files) | **Do not carry forward.** By the branch's own readiness doc they are local heuristics over `localStorage` producing precise-looking scores with no data behind them. Shipping them would present fabricated intelligence to users. Keep the branch as an idea archive; revisit individual ideas in Phase 8 only if usage data supports them. |
| Demo-mode cookie | Replace with a genuinely public, read-only preview (or seeded demo account) that needs no bypass. |
| `main` schema | Replace with a normalised design derived from PR #1 (topics as rows, interaction events, memory, saved). |
| Feed query | Rebuild as a server-side ranked, cursor-paginated query with real signals; drop the fake match score until a real one exists. |
| API layer | Rebuild with schema validation, uniform errors, rate limiting, partial updates. |
| UI components | Rebuild on a documented token-based design system; current components are one-off Tailwind strings. |
| Smoke test | Replace with unit, integration (against local Supabase, including RLS tests) and Playwright E2E. |
| `DAX_*.py`, `CLEANUP_NOTES.md` | Move out of this repository (owner approval required). |

## 7. Recommended technical direction (proposal — to be finalised in `VSHARES_ARCHITECTURE.md`)

A single deployable **modular monolith**. No microservices; nothing in the evidence justifies them.

| Concern | Recommendation | Rationale | Alternative considered |
|---|---|---|---|
| Web framework | Next.js App Router + TypeScript (strict) | Already in use on all branches; server components suit a read-heavy feed; one codebase for UI and API. | Separate SPA + API service: more moving parts, no benefit at this stage. |
| Database | PostgreSQL | Relational data (users, topics, content, interactions); ranking expressible in SQL; mature. | Document store: poor fit for joins/anti-joins the feed needs. |
| Auth + DB host | Supabase (Auth, Postgres, RLS, Storage) | Existing schemas and RLS policies target it; removes the need to build session management and password handling; EU/UK regions available for UK GDPR. | Self-managed Postgres + Auth.js + an ORM: more control and portability, materially more security-critical code to own. Keep data access behind a server-side module so this stays reversible. |
| Validation | Zod schemas shared by API and forms | Single source of truth for input contracts. | — |
| Styling | Tailwind 4 with CSS-variable design tokens | Already in use; tokens make the eventual brand decision a config change. | — |
| Tests | Vitest (unit/integration), Playwright (E2E + axe accessibility), pgTAP or SQL-level RLS tests | Covers logic, the real browser journey, and authorisation at the layer that enforces it. | — |
| CI | GitHub Actions: lint, typecheck, tests, build, `npm audit`, secret scanning | Repo is on GitHub; free for public repos. | — |
| Hosting | **Open decision** (Q5) — Vercel or Render paid tier | Vercel is the lowest-friction Next.js host; Render keeps the current blueprint. Free tiers are not production-suitable. | — |
| Observability | Structured server logs + health endpoint first; error tracking (e.g. Sentry) when approved | Third-party services may incur cost — needs approval. | — |
| Rate limiting | Supabase Auth's built-in limits for auth; app-level limiter for write endpoints | Choice of backing store deferred to Phase 1. | — |

## 8. Proposed repository structure

```text
.
├── CLAUDE.md                     engineering rules for future sessions
├── docs/                         VSHARES_*.md project documents
├── src/
│   ├── app/
│   │   ├── (marketing)/          public pages
│   │   ├── (auth)/               login, callback
│   │   ├── (app)/                feed, explore, saved, profile, onboarding
│   │   └── api/                  route handlers (thin; delegate to features)
│   ├── features/                 one folder per domain: feed, content, topics,
│   │   └── <feature>/            profile, saved — each with components/,
│   │                             schemas.ts, queries.ts, actions.ts
│   ├── components/ui/            design-system primitives
│   ├── lib/                      env, supabase clients, http helpers, logger
│   └── styles/                   tokens and globals
├── supabase/
│   ├── migrations/               forward-only SQL migrations
│   ├── seed.sql                  local-only seed data
│   └── tests/                    RLS / SQL tests
├── tests/
│   ├── integration/
│   └── e2e/                      Playwright
└── .github/workflows/ci.yml
```

## 9. Decisions required from the owner

These block Phase 1. Each has a recommended default.

| # | Question | Why it matters | Recommended default |
|---|---|---|---|
| Q1 | **Is the core product the learning-feed platform described in §3** (topics → personalised feed → memory → sharing)? Or has the vision changed (the name "VSHARES" could suggest something else, e.g. finance)? | Everything depends on it. | Yes — learning feed, per all repo evidence. |
| Q2 | **Product name and brand direction**: "VShare" or "VSHARES"? Black/gold (PR #1), light/violet (`main`), or a new direction? Any existing logo or brand assets? | Design system cannot be finalised without it. | Name as you instruct; propose 2–3 token palettes for you to choose from. |
| Q3 | **Where does feed content come from at launch?** (a) user-submitted links only, (b) a curated catalogue seeded by the team, (c) automated ingestion from external sources, (d) original content hosted on the platform (video/articles). | Drives schema, storage, moderation, licensing and cost more than any other choice. | (b) + (a): curated seed catalogue plus user submissions with moderation. |
| Q4 | **Business model and audience**: free, subscription, creator marketplace, B2B? Consumer age range and launch markets (UK only, UK+EU, global)? | Determines payments scope, GDPR/age-appropriate-design obligations, data residency. | Free MVP, adults (18+), UK launch, EU-region data hosting. |
| Q5 | **Hosting and paid services**: is there a live Render deployment and a real Supabase project today? May the rebuild use paid tiers (hosting, Supabase Pro for backups/PITR, error tracking)? | Free tiers have no backups or uptime guarantees; nothing paid will be provisioned without approval. | Approve in principle; itemised costs presented in Phase 7 before any spend. |
| Q6 | **MVP scope** — confirm the first end-to-end journey: sign up → pick topics → ranked feed → save / like / skip / mark done → saved library → share a resource → profile & settings (incl. data export and account deletion). Streaks, paths, creators, "VAI", goals are deferred to Phase 8. | Keeps Phase 4 to one complete journey. | As listed. |
| Q7 | **The trading script and leaked keys**: approve removing `DAX_GOLD_PLUS_v7_LEARNING_READY.py` and `CLEANUP_NOTES.md` from this repo? Rewrite history to purge the keys, or rotate and leave history? | Deletion and history rewrites need explicit approval. | Rotate keys now; remove both files; no history rewrite once keys are rotated (rewrites break the open PR branches). |
| Q8 | **Old branches and PRs** (#1, #3, #4, #5): close and keep the branches as archives? | Housekeeping; nothing will be closed or deleted without approval. | Close PRs, keep branches. |
| Q9 | **Sign-in methods**: magic link only, email+password, Google/Apple/GitHub? | Auth UX and security surface. | Magic link + Google; no passwords to store or reset. |
