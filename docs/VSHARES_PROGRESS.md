# VSHARES — Progress Log

## Current state

- **Phase:** 2 Core application. Milestones 1 and 2 are complete and tested; Milestone 3 (catalogue and moderation) is next and has not started.
- **Branch:** `claude/gallant-mendel-xey567`. Nothing merged to `main`, nothing deployed.
- **What works:** the application shell and design system; the identity schema with row-level security on every table; profiles, roles, preferences, guest accounts, guest upgrade and collision handling; sign-in and sign-out surfaces. 76 unit tests, 89 database assertions and 54 end-to-end tests pass.
- **What is implemented but not verified here:** the auth service journeys (magic link, code exchange, anonymous session, identity linking). This environment has PostgreSQL but no container runtime, so the auth service cannot run. See the test report.
- **What does not exist yet:** catalogue, feed, saving, progress. Every destination has a real route; unfinished ones say so on the page.

## Decisions required

| # | Decision | Recommended default | Blocks |
|---|---|---|---|
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

### 2026-11-14 — Phase 0

- Audited `main`, 7 PRs and 6 unmerged branches; ran existing checks; wrote the discovery document. Found credentials committed to the public repository.
