## Current state

- **Phase:** 3 Value Feed, complete. Milestones 1 to 6 are built and tested; Milestone 7 (essential analytics) is next and has not started.
- **Branch:** `claude/gallant-mendel-xey567`. Nothing merged to `main`, nothing deployed.
- **Verified this session:** 157 unit tests, 305 database assertions over 20 files against real PostgreSQL 16, 82 end-to-end tests passing and 46 skipped, lint and types clean, 20 routes built, 0 production-dependency advisories.
- **What works:** the shell and design system; identity with row-level security on every table, profiles, roles, preferences, guest accounts and in-place upgrade; the catalogue with versions, moderation, reporting and an audit log; the Value Feed with VAI's deterministic ranker, finite seven-card sessions and explanations generated from logged evidence; the first learning win with no account; the saved library; the progress dashboard; consent-first measurement; resource submission with correction and resubmission; sharing; data export; account deletion; and a guest purge job.
- **What is implemented but not verified here:** the auth-service journeys — magic link, code exchange, anonymous session, identity linking — and the rendered journeys that depend on them. This environment has PostgreSQL but no container runtime and no outbound network, so the auth service cannot run. 46 tests are written and skipped with stated reasons.
- **Deliberately not enabled:** the guest purge is not scheduled. Its policy is in `VSHARES_GUEST_LIFECYCLE.md` and automatic deletion needs owner approval.
- **Not claimed:** full account erasure is proven at the database layer, not end to end through a real sign-in.
- **Awaiting review:** the first 10 value cards in `VSHARES_CATALOGUE_BATCH_1.md`. Seeded as drafts; none can publish because their links are unchecked.
- **Still missing for the MVP:** essential analytics screens (M7), an admin catalogue and taxonomy interface, library free-text search, and Google sign-in (needs an OAuth client).

## Decisions required

| # | Decision | Recommended default | Blocks |
|---|---|---|---|
| D17 | **46 live-service tests are now blocked on a database.** `VSHARES_SUPABASE_SETUP.md` has the exact steps; it costs nothing and needs only the publishable key | Create a free development project and send the project URL and anon key | Verification of six milestones' worth of journeys |
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

### 2026-11-14 — Phase 0

- Audited `main`, 7 PRs and 6 unmerged branches; ran existing checks; wrote the discovery document. Found credentials committed to the public repository.
