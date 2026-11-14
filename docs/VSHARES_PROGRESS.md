# VSHARES — Progress Log

## Current state

- **Phase:** 1 Product foundation — documents complete in draft, awaiting owner sign-off.
- **Next:** Milestone M1 (foundation and shell) — starts on sign-off.
- **Rebuild application code written so far:** none. Changes to code so far are limited to security and dependency fixes on the legacy app.

## Decisions required

| # | Decision | Recommended default | Blocks |
|---|---|---|---|
| D1 | Sign off the Phase 1 documents (spec, architecture, data model, API contracts, security, design system, roadmap) | Approve, with any corrections | M1 |
| D2 | Approve replacing the legacy application code (`app/`, `components/`, `lib/`, `middleware.ts`, legacy migration, seed, smoke script) on the rebuild branch. It stays in git history and on `main` until you merge | Approve | M1 |
| D3 | Confirm the Alpaca key pair has been revoked and rotated | — | Release gate; recorded in SEC-2026-001 |
| D4 | Does a hosted Supabase project or a live Render service exist? If yes, share the project reference / service URL (not keys) so it can be inventoried | — | M8 planning; nothing before |
| D5 | Launch catalogue: who curates it and how big? | I draft ~100 value cards across 8 topics from real, link-checked resources, flagged AI-assisted; you review before publication | M3 |
| D6 | Initial topic list for the MVP | Technology & AI · Career · Entrepreneurship · Personal finance · Productivity · Communication · Health & wellbeing · Learning how to learn | M3 |
| D7 | Analytics for visitors before consent: identifier-free aggregate counts only, or pseudonymous first-party measurement under legitimate interests | Identifier-free until consent | M7 |
| D8 | PR disposition: close #1, #3, #4, #5 with a link to the report, keep branches | Approve | — |
| D9 | Validation targets in spec §B1 | Accept as proposed | M7 |
| D10 | Historical brand assets: supply logo / screenshots, or allow this environment to reach `vshare.lovable.app` so the beta can be audited | Supply screenshots if any exist; otherwise proceed with the specified system | M1 reference screens |

## Log

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
- The Lovable beta could not be inspected (host blocked from this environment).
- Existing Supabase / Render connections could not be verified (no credentials or references available).
- One moderate, dev-only dependency advisory remains (see security doc §7).

### 2026-11-14 — Phase 0

- Audited `main`, 7 PRs and 6 unmerged branches; ran existing checks; wrote the discovery document. Found credentials committed to the public repository.
