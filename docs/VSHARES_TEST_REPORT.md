# VSHARES — Test Report

Only results that were actually produced are recorded here. "Not run" means not run.

## 2026-11-14 — Baseline on legacy code (rebuild branch, commit `e1c1ac6`)

Environment: Node 22, clean `npm ci`, no database, no environment variables.

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | pass |
| Lint | `npm run lint` | pass (0 warnings) |
| Types | `npm run typecheck` | pass |
| Legacy smoke | `npm run test:smoke` | pass — greps source for marketing copy only; **not a behavioural test** |
| Build | `npm run build` | pass (11 routes) |
| Audit, production deps | `npm audit --omit=dev` | 0 vulnerabilities |
| Audit, all deps | `npm audit` | 8 moderate (one dev-only root advisory; see security doc §7) |
| Redirect sanitiser | ad-hoc script over 6 inputs (null, relative path, `//host`, absolute URL, backslash form, path with query) | all resolve same-origin as expected; to be replaced by unit tests in M2 |
| Credential audit | exact-match and pattern search over all remote branches and history | leaked values only in `5db2911` on `main`; no other credentials found |

Before the upgrade the same audit reported 19 vulnerabilities (1 critical, 8 high, 10 moderate).

### Not run / not verified

| Item | Why |
|---|---|
| CI workflow (`.github/workflows/ci.yml`) | Triggers on pull requests and pushes to `main`; no run has occurred yet. Its first run must be checked, including the gitleaks job |
| gitleaks scan | Could not be executed locally in this environment |
| Anything against a real or local Supabase: sign-in, writes, RLS, signup trigger | No database available in this session; local stack arrives in M1 |
| Google sign-in | No OAuth client |
| Unit, integration, E2E, accessibility suites | Do not exist yet; created from M1 |
| Deployed environments | None known |

## Test inventory required for the MVP

| Suite | Tool | Covers | Milestone |
|---|---|---|---|
| Unit | Vitest | Ranking components and ordering, affinity updates, session assembly, Next Best rules, Zod schemas, URL and redirect rules, env schema, rate limiter, pipeline stages | M1, M4 |
| Database | SQL tests on local Supabase | Per-table RLS isolation (two users), guest restrictions, role checks, append-only guards, server functions, signup trigger, cascade on deletion | M2–M6 |
| Integration | Vitest + local Supabase | Every server action as visitor, guest, user, moderator, admin; error envelope; idempotency; rate limits | M2–M7 |
| End-to-end | Playwright (360px and 1280px) | First Learning Win as a guest; sign-up and guest upgrade; feed session to closing card; save / like / skip; saved library; submit → moderate → publish; export; delete; admin access denied for learners | M1–M6 |
| Accessibility | axe in Playwright + keyboard-only run + manual screen-reader pass | Every core screen | M1, M8 |
| Security | Header and CSP assertions, XSS fixtures, over-posting, enumeration, gitleaks, npm audit | See security doc §8 | M1–M8 |
| Analytics | Vitest + SQL | Vocabulary enforcement, consent gating, rollup reconciliation | M7 |
| Performance | Lighthouse on home and first card (mobile profile) | Budget set in M1 | M5, M8 |
| Operational | Manual, recorded | Backup restore drill, runbook walkthrough | M8 |

## 2026-11-14 — Milestone 1 (foundation and shell)

Environment: Node 22, clean `npm ci`, no database. End-to-end suites run against a production build (`next build` then `next start`), with the preinstalled Chromium.

| Check | Command | Result |
|---|---|---|
| Repository hygiene | `npm run check:hygiene` | pass — no foreign file types, forbidden packages or unpinned dependencies |
| Lint | `npm run lint` | pass (0 warnings), including the module-boundary and raw-HTML rules |
| Types | `npm run typecheck` | pass (strict, `noUncheckedIndexedAccess`) |
| Unit tests | `npm test` | **54 passed, 0 failed** (5 files) |
| Production build | `npm run build` | pass — 11 routes |
| End-to-end, accessibility, security headers | `npm run test:e2e` | **44 passed, 0 failed** (22 tests × mobile and desktop) |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |
| Audit, all dependencies | `npm audit` | 8 moderate, development-only (one root advisory; security doc section 7) |

### Unit coverage by area

| File | Tests | What it proves |
|---|---|---|
| `tests/unit/action.test.ts` | 15 | The pipeline refuses a signed-out caller, refuses a guest on an account action, refuses a role mismatch, ignores a client-supplied user id, rejects unknown fields, checks access before input, enforces rate limits, and converts an internal error into a safe message with no connection detail |
| `tests/unit/env.test.ts` | 8 | Configuration is validated or the process fails with a readable message; empty variables are absent, not values |
| `tests/unit/rate-limit.test.ts` | 8 | Fixed windows, per-subject and per-bucket isolation, retry timing, reset |
| `tests/unit/redirect.test.ts` | 17 | Twelve hostile redirect inputs all resolve to the same origin |
| `tests/unit/taxonomy.test.ts` | 6 | The eight approved categories, unique slugs, high-impact marking |

### End-to-end coverage

| File | What it proves |
|---|---|
| `tests/e2e/shell.spec.ts` | Home states the promise and offers topics; all five destinations return 200 with the right heading; the current tab is marked; a visitor can walk home → category; unfinished screens display their notice; 404 works; the client layer hydrates with no console errors; health and readiness leak no configuration |
| `tests/e2e/accessibility.spec.ts` | Zero axe violations (WCAG 2.0/2.1/2.2 A and AA) on all seven routes; keyboard reaches content and navigation with a visible 2px focus ring; navigation tap targets are at least 44px tall; no horizontal scrolling at 360px |
| `tests/e2e/security-headers.spec.ts` | All security headers present; the policy is strict and nonce-based with no `'unsafe-inline'` for scripts; a fresh nonce per response; the development gallery returns 404 in production |

### Defects found and fixed during the milestone

| What | How it was found | Fix |
|---|---|---|
| `z.string().url()` accepted `localhost:54321` as a valid URL | Unit test for malformed database configuration | Protocol is now checked explicitly: http or https only |
| The strict policy blocked all scripts on prerendered pages, so nothing hydrated | The hydration end-to-end test | Routes render per request so the nonce applies (decision D-030) |
| The brand mark painted blank in the mobile header | Reviewing the captured screenshots | Each instance gets a unique gradient id |

### Not run / unverified

| Item | Why |
|---|---|
| Continuous integration | The workflow has never executed. It triggers on pull requests and on `main`, and this work is on a development branch. **Report as unverified, not as passed.** |
| gitleaks | Runs in the CI job above; it could not be executed in the local environment |
| Database, row-level security, authentication | No database exists yet; the first tables arrive in Milestone 2 |
| Deployed environments | None exist |
| Screen-reader pass, performance budget | Scheduled for Milestone 8; automated accessibility checks run from now on |

### Visual evidence

`docs/evidence/milestone-1/` holds a screenshot of every route at phone (Pixel 7) and desktop (1280×900) width, regenerated with `scripts/capture-screenshots.mjs`.

## 2026-11-14 — Milestone 1 continuous integration

The workflow executed for the first time on pull request #8 (draft, not for merging).
Run: `43596430142`, commit `badb964`.

| Job | Result |
|---|---|
| Hygiene, lint, types, unit tests, build | **pass** |
| End-to-end, accessibility and security headers | **pass** |
| Dependency audit | **pass** |
| Secret scan (gitleaks, full history) | **pass** |

This closes the Milestone 1 item that was previously reported as unverified. The secret scan, which could not run locally, passes over the whole history with the documented exclusion for the removed file (SEC-2026-001).

## 2026-11-14 — Milestone 2 (identity, authentication and profiles)

### What is real and what is not

The owner asked for tests against a real local stack to be distinguished from tests that are not. This environment has PostgreSQL 16 but no container runtime, so the Supabase CLI stack (which runs the auth service) cannot start here.

| Layer | Status |
|---|---|
| **Database: real.** Real PostgreSQL 16.15, the real migrations applied in order, policies evaluated against the same `request.jwt.claims` setting the API layer sets per request. Nothing mocked. | **tested** |
| **Application logic: real unit tests** for every input contract and for the authorisation pipeline. | **tested** |
| **Auth service journeys** (sending a magic link, exchanging a code, creating an anonymous session, linking an identity): the adapter is written, but the service is not reachable here. | **implemented, not verified** |

### Results

| Check | Command | Result |
|---|---|---|
| Database policies and functions | `npm run test:db` | **9 files, 89 assertions, 0 failed** |
| Unit tests | `npm test` | **76 passed, 0 failed** (6 files) |
| End-to-end, accessibility, headers | `npm run test:e2e` | **54 passed, 8 skipped, 0 failed** |
| Hygiene, lint, types, build | — | pass |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |

The 8 skipped tests are the live auth journeys in `tests/e2e/auth-live.spec.ts`. They are skipped with a stated reason and run automatically the moment an auth service is configured. They were not replaced with weaker checks that would pass without one.

### Database coverage (89 assertions, real PostgreSQL)

| File | Proves |
|---|---|
| `010_signup.sql` | Creating an account provisions exactly one profile and one preferences row, private by default, with a handle we generate |
| `020_handle_collision.sql` | Three accounts whose provider data suggests the same handle all get created with distinct handles; awkward and empty seeds still produce valid handles. This is the legacy defect C1, now impossible |
| `030_profile_isolation.sql` | With two distinct users: neither can read or change the other's profile or preferences; a cross-account update changes nothing; identity and creation date cannot be rewritten; a viewer can neither insert nor delete a profile row |
| `040_public_profiles.sql` | A public profile is readable by others and by a signed-out visitor; a private one is not; a signed-out visitor is refused the preferences table outright |
| `050_guest_restrictions.sql` | A guest has their own profile and preferences and can edit them, cannot make themselves public, cannot touch another account, and the guest flag comes from the verified session rather than an editable column |
| `060_roles.sql` | A new account holds no role; a viewer cannot self-grant by insert or through the function; an administrator can grant and revoke; the last administrator cannot be removed; a moderator is not an administrator; a moderator can read profiles for moderation and a plain account cannot |
| `070_account_merge.sql` | On a collision the merge is recorded and the existing account's display name, session length and personalisation choice are all unchanged; only the target may merge; self-merges, guest targets, registered sources and unknown accounts are refused; the record cannot be edited or deleted and is private to the target; deleting the account removes its merge records |
| `080_account_deletion.sql` | Deleting an account removes its profile, preferences and role grants and leaves other accounts untouched; stale guests are purged while recent guests and old registered accounts are kept; a viewer cannot run the purge |
| `090_constraints.sql` | Handle length, character and uniqueness rules, session-length bounds and display-name length are enforced in the database, not only in the application |

### Defects found and fixed during the milestone

| What | How it was found | Fix |
|---|---|---|
| Handle generation called a pgcrypto function that is unreachable under the pinned empty search path, so **every account creation would have failed** on a project where the extension lives in another schema | Database test run | Uses the core `pg_catalog.gen_random_uuid()` instead; no extension dependency |
| The append-only guard on merge records blocked the cascade from account deletion, so **deleting an account would have failed** once a merge existed | Database test run | The guard now covers edits only; deletion happens solely through the account cascade, and no user-scoped client holds a delete grant. A test now asserts erasure works |
| The sign-in and You pages had no `h1` in their unavailable state | End-to-end run | Both states carry a heading |
| The proxy imported the vendor SDK directly, crossing the architecture boundary | Lint rule added in Milestone 1 | Session refresh moved into `src/platform/auth/session.ts` |

### Still not verified

| Item | What is needed |
|---|---|
| Magic-link sign-in end to end, code exchange, anonymous session creation, identity linking, sign-out | A running auth service: a container runtime for the local stack, or a Supabase project. Owner decision; no paid tier required |
| The JavaScript-to-database path (module repositories) | The same. The SQL those repositories call is covered by the database suite |
