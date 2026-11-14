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

### Continuous integration

Run `43618418559` on commit `7f91944` (the Milestone 2 code), pull request #8:

| Job | Result |
|---|---|
| Hygiene, lint, types, unit tests, build | **pass** |
| **Database policies and functions** (PostgreSQL 16 service container) | **pass** — 89 assertions |
| End-to-end, accessibility and security headers | **pass** |
| Dependency audit | **pass** |
| Secret scan (gitleaks, full history) | **pass** |

The database suite now runs on every push and pull request against a real PostgreSQL service, so a policy regression fails the build.

### Still not verified

| Item | What is needed |
|---|---|
| Magic-link sign-in end to end, code exchange, anonymous session creation, identity linking, sign-out | A running auth service: a container runtime for the local stack, or a Supabase project. Owner decision; no paid tier required |
| The JavaScript-to-database path (module repositories) | The same. The SQL those repositories call is covered by the database suite |

## 2026-11-14 — Milestone 3 (catalogue, content management and moderation)

| Check | Command | Result |
|---|---|---|
| Database policies and functions | `npm run test:db` | **15 files, 166 assertions, 0 failed** |
| Unit tests | `npm test` | **76 passed, 0 failed** |
| End-to-end, accessibility, headers | `npm run test:e2e` | **62 passed, 14 skipped, 0 failed** |
| Hygiene, lint, types, build | — | pass (16 routes) |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |
| Link check of the seeded catalogue | `npm run check:links` | **0 of 10 reachable** — this environment refuses every outbound request at DNS. The checker itself works and recorded each failure |

The 14 skips are the live authentication journeys (8) and the catalogue
checks that need a database with the seed applied (6). Both sets run
automatically once a service is reachable; neither was replaced by a weaker
check that would pass without one.

### Continuous integration

Run `43626705022` on commit `8b3e44d`, pull request #8: **all five jobs passed** — hygiene/lint/types/unit/build, database policies and functions, end-to-end and accessibility, dependency audit, and the full-history secret scan.

### Database coverage added (77 new assertions)

| File | Proves |
|---|---|
| `100_taxonomy.sql` | A plain account can neither create a category through the function nor insert one directly; an administrator can create and edit categories and topics and every change is audited; the taxonomy is readable by signed-in and signed-out visitors; archiving hides a category from the public but not from staff |
| `110_card_lifecycle.sql` | Only staff create cards; a new card starts as a draft with its first version; **publication is refused while the source link is unchecked**; a moderator cannot record a link check by hand; approval records the reviewer and the time; rejection and archiving need a reason; a version cannot be edited in place and a correction becomes a second version; a published card survives the deletion of the account that reviewed it, keeping the fact of review and losing the person |
| `120_high_impact.sql` | The high-impact flag follows the category automatically; the author of high-impact content cannot approve their own work; a second moderator can; ordinary content needs no second reviewer |
| `130_submissions.sql` | A guest cannot submit; a submission is always created pending and marked user-submitted whatever the caller asks for; a submitter cannot approve, publish by direct update, or mark their own link checked; a submitter sees their own pending submission and its rejection reason, another account and a signed-out visitor see neither it nor its text, and a moderator sees it in the queue |
| `140_reports_and_audit.sql` | A guest cannot report; a registered account can, once per card; a reporter cannot resolve their own report and a moderator can; reports are private to reporter and staff; audit entries are written with the actor, cannot be edited or deleted, and are readable only by an administrator |
| `150_public_visibility.sql` | A published card, its current version, its publisher and its author are all readable by a signed-out visitor, so attribution can always be shown; archiving removes both the card and its text from public view; the same source link cannot be added twice while a card for it is live |

### Defects found and fixed during the milestone

All four were found by the tests, and three would have caused failures in production.

| What | Consequence if shipped | Fix |
|---|---|---|
| The append-only guard blocked the `set null` that erasure performs on actor columns | **Deleting any account that had created a content version, moderation action or audit entry would have failed** | A guard that permits exactly one change — a named actor column moving to null — and refuses every other edit |
| The publication constraint required the reviewer reference | **Deleting a moderator's account would have failed** once they had published anything | The constraint names the review *time*, not the reviewer; who reviewed what lives in the moderation trail, which anonymises the same way |
| `app.current_user_id()` cast an empty claims setting to JSON | Any request with an empty claims setting, which is how a privileged client arrives, **would have raised instead of reporting no user** | The setting is emptied to null before the cast |
| The module barrel reached server-only code | The database client was pulled into a browser bundle and the build failed | Modules now have two entry points: `index.ts`, safe for a client component, and `server.ts` for database reads. The lint rule enforces it |

### Against the Milestone 3 acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Categories and topics load from PostgreSQL | **Implemented.** Explore and category pages read from the database; the typed taxonomy is now only the seed source. Proven by the database suite; the rendered page with data needs a configured database |
| 2 | Admins can create, edit and review cards | **Implemented and tested** at the function layer: create, version, approve, reject, archive, restore. The admin queue is built |
| 3 | Non-admins cannot access privileged actions | **Tested** at every layer: the action pipeline refuses, the database functions refuse, the policies refuse, and the admin routes return 404 |
| 4 | Submissions cannot bypass moderation | **Tested.** Status and origin are set by the database function, not the caller |
| 5 | Publication requires approval | **Tested**, and additionally requires a checked link |
| 6 | High-impact content requires a second reviewer | **Tested** |
| 7 | Versions and moderation actions are auditable | **Tested.** Versions are insert-only, the moderation trail runs submit to approve, and the audit log is append-only and admin-only |
| 8 | Public card pages display correct attribution | **Implemented.** Publisher, author and source link are readable by anyone and shown on the page, with an AI-assisted label where it applies. Rendering with data needs a configured database |
| 9 | Database isolation and access tests pass | **166 assertions, 0 failed** |
| 10 | The first 10 cards ready for review | **Ready** in `docs/VSHARES_CATALOGUE_BATCH_1.md`, seeded as drafts. **Their links are unverified** — see below |

### Still not verified

| Item | What is needed |
|---|---|
| Every source link in batch 1 | Network access. The checker is written and works; this environment refuses all outbound requests. **No card can be published until it passes**, enforced by the database |
| The rendered catalogue with real data | A configured database; 6 tests are written and skipped |
| Live authentication journeys | Unchanged from Milestone 2; 8 tests written and skipped. Procedure in `VSHARES_VERIFICATION_PROCEDURE.md` |

## 2026-11-14 — Milestone 4 (Intelligent Value Feed and VAI ranking)

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **128 passed, 0 failed** (9 files; 52 new for the ranker, session, explanations and a worked example) |
| Database policies and functions | `npm run test:db` | **17 files, 220 assertions, 0 failed** (54 new) |
| End-to-end, accessibility, headers | `npm run test:e2e` | **66 passed, 22 skipped, 0 failed** |
| Hygiene, lint, types, build | — | pass (16 routes) |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |

The 22 skips are the live journeys: authentication (8), catalogue (6) and
feed (8). Each is written and skipped with a stated reason, and runs the
moment a service is configured.

### Database query performance — measured, not assumed

`npm run measure:feed` builds a scratch database with **5,000 published
cards, 30,000 interactions and 2,000 topic preferences**, then runs each
query five times under `EXPLAIN ANALYZE`.

| Query | Median |
|---|---|
| Candidate pool (exclusions applied, limit 200) | **0.48 ms** |
| Viewer memory (topics and interactions) | 0.14 ms |
| Saved library | 0.03 ms |
| Progress summary (completions only) | 0.07 ms |
| Published card by slug | 0.12 ms |

**A real optimisation came out of measuring.** The candidate query for a
session spanning all topics was doing a sequential scan over every published
card — 5.15 ms, reading 4,940 rows to return 200 — because the existing
partial index is topic-first. Adding `content_items_published_recent_idx`
turned it into an index scan reading only the rows needed: **5.15 ms → 0.60
ms, an eight-fold improvement**, confirmed over three runs.

### Ranker coverage (43 unit tests)

| Area | What is established |
|---|---|
| Determinism | Identical inputs give an identical score and breakdown; the order does not depend on the order candidates arrive in; exact ties break on publication date then id |
| Declared interests | A chosen topic outranks an unchosen one of equal quality, and cannot be outweighed by quality alone at the approved weights; a secondary topic counts for half |
| Quality | A better-reviewed card outranks a worse one, all else equal |
| Level fit | Full marks at the person's level, half a step away, zero two steps away; beginner assumed when nothing is known |
| Engagement quality | Exactly the prior with no data; pulled towards the prior on a tiny sample; approaches the observed rate with 2,000 impressions; never leaves [0,1] |
| Freshness and time | Gentle decay that cannot reorder on its own at weight 0.05; time fit full inside the chosen session length, zero at four times it |
| Repetition | A card shown and not opened is penalised, the penalty is capped so nothing is buried for ever, and a just-read source is penalised |
| Cold start | With nothing known, ranking falls to quality, engagement and freshness, and every candidate still scores above zero |
| Personalisation off | Everything learned is ignored, including penalties, while quality, freshness and an explicitly chosen topic still apply |
| Weight changes | Re-weighting towards quality genuinely reorders the feed, so a configuration change is a real lever |

### Session and explanation coverage (19 unit tests)

Exactly seven cards by default; positions numbered without gaps; no card
twice; honest when the catalogue is short or empty; configurable length;
reproducible. No more than two consecutive cards from a topic, at most two
from one source, and the session is still filled when those rules conflict.
One discovery slot at position five when the person has declared topics,
none when they have not, and no gap when there is nothing outside their
topics.

Explanations name the strongest real contribution first, never claim a
reason that contributed nothing, say when a card is there to widen the
picture, mention a repetition penalty when one applied, say when
personalisation is off, and always give at least one sentence.

### Database coverage added (54 assertions)

| File | Proves |
|---|---|
| `160_interactions.sql` | Opening is recorded but does not complete; completing twice counts once; counters move exactly once; the card's length at completion is kept; saves and likes can be undone and completing clears a skip; **unpublished content cannot be completed, saved or given an impression**; progress cannot be inserted or edited directly; one person's history and preference memory are invisible to another |
| `170_feed_sessions.sql` | Chosen topics are recorded and unticking works; a chosen level is stored and marked as the person's own; **affinity cannot be written directly**; completing something raises affinity without swinging it to the maximum; resetting affinities restores the starting point; resetting history clears skips but keeps completions; an unknown reset scope is refused; a session records the configuration version; recommendations and their component breakdowns are logged; the summary counts only what was finished and the minutes of the card actually completed; another account can neither end, write into, attribute impressions to, nor read someone else's session; **a guest can choose topics, run a session, complete and save, all on their own account**; impressions count per showing and are never progress |

### Against the Milestone 4 testing requirements

| # | Requirement | Status |
|---|---|---|
| 1 | Deterministic ranking | **Tested** — 3 tests |
| 2 | Cold-start recommendations | **Tested** — 2 tests |
| 3 | Topic relevance | **Tested** — 3 tests |
| 4 | Ranking weight changes | **Tested** |
| 5 | Duplicate prevention | **Tested** — no card twice in a session; idempotent interactions |
| 6 | Completed-content handling | **Tested** — excluded from candidates; completing twice counts once |
| 7 | Skip behaviour | **Tested** — excluded, and affinity moves down |
| 8 | Guest personalisation | **Tested** at the database layer |
| 9 | Account preference persistence | **Tested** |
| 10 | Seven-card session boundaries | **Tested** — 6 tests |
| 11 | Session summaries | **Tested** — counts only completions |
| 12 | Recommendation explanations | **Tested** — 6 tests, including that no unused reason appears |
| 13 | Published-content-only enforcement | **Tested** at both layers |
| 14 | Access control | **Tested** — cross-account refusals on every feed table and function |
| 15 | Mobile and desktop accessibility | **Tested** — axe on every route at both viewports, 0 violations |
| 16 | Empty catalogue behaviour | **Tested** — ranker, session assembly and the interface each handle it |
| 17 | Database query performance | **Measured** — table above |

### Defects found and fixed during the milestone

| What | How found | Fix |
|---|---|---|
| **An explanation claimed "most people who started this finished it" for a card nobody had been shown.** The engagement component falls back to a stated prior with no data, and the explainer treated that as a measurement | Reading the output of the worked example | The sample size is now recorded alongside the component, and the sentence only appears above twenty impressions. Three tests hold the line |
| The all-topics candidate query did a sequential scan over the whole catalogue | Performance measurement | A partial index on publication date; 5.15 ms → 0.60 ms |
| The feed client set state synchronously inside an effect, risking cascading renders | Lint rule | Restructured with a cancellation flag and an attempt counter |
| My own synthetic performance loader was refused by the publication constraint | Running it | The constraint was right; the loader now creates drafts, versions them, then publishes |

### Continuous integration

Run `43629183346` on commit `743ea30`, pull request #8: **all five jobs passed** — hygiene, lint, types, unit tests and build; database policies and functions; end-to-end and accessibility; dependency audit; full-history secret scan.

### Worked example

`npx vitest run tests/unit/worked-example.test.ts` ranks the ten batch-1
cards for several learner profiles, asserts the behaviour and prints the
result with the reason given for each card. It is a test, so it cannot drift
from the code, and it is readable evidence of what the ranker does.

For someone who chose Budgeting and Avoiding scams:

```
  pos  score   card
    1  0.743  The pause that stops most financial scams
         why: You chose avoiding scams. Our reviewers rated this highly. It matches the level you are working at.
    2  0.726  A budget planner that does the arithmetic for you
    3  0.453  The handful of security steps that matter most
    4  0.453  What actually helps when you cannot sleep
    5  0.443  How to ask an organisation what it knows about you  [discovery]
         why: Something outside your usual topics, to widen the picture. ...
    6  0.439  Writing that people understand the first time
    7  0.429  Preparing for an interview without guessing
```

The chosen topics lead without crowding everything else out, and position
five is given to a topic the person did not ask for, labelled as such.

One assertion in this file was wrong and the ranker was right: a 35-minute
card stays last for someone with a ten-minute session even when the level
matches, because time fit scores zero at four times the session length. The
test now records that as intended behaviour, and checks that the same card
rises for someone with longer to spend.

### Still not verified

Unchanged: live authentication, the rendered catalogue and the rendered feed
all need a configured service. 22 tests are written and skipped. Source links
remain unverified and no card can be published until they pass.

## 2026-11-14 — Milestone 5 (First Learning Win, library and progress)

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **135 passed, 0 failed** (10 files; 7 new for Next Best Move) |
| Database policies and functions | `npm run test:db` | **18 files, 243 assertions, 0 failed** (23 new) |
| End-to-end, accessibility, headers | `npm run test:e2e` | **74 passed, 36 skipped, 0 failed** |
| Hygiene, lint, types, build | — | pass (17 routes) |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |

### Live versus simulated — stated plainly

| Layer | Status |
|---|---|
| Database rules, policies and functions | **Real.** PostgreSQL 16, the real migrations, policies evaluated against the same request claims the API layer sets. 238 assertions |
| Ranking, session assembly, explanations, next best move | **Real.** Pure functions, 135 unit tests, including a worked example on the actual batch-1 cards |
| Rendered journeys with content | **Not verified.** 32 end-to-end tests written and skipped for want of a service |
| Source links | **Not verified.** No outbound network here; the database refuses to publish an unchecked card |

Nothing in this milestone is reported as passing that has not run.

### Measurement coverage (18 new assertions)

`180_measurement.sql` proves the consent design behaves as described:

- A signed-out visitor contributes to the aggregate and **nothing identifying them is stored**.
- A signed-in account that has not granted consent is treated the same way.
- With consent granted, an identified event appears, and the aggregate still counts exactly once.
- **Withdrawing consent deletes the events collected under it, without the person having to ask** — a database trigger does it.
- Events are private to the person: another account cannot read them, and **neither can staff**. Product questions are answered from the aggregate.
- An event name nobody defined is refused, so a typo cannot create a metric.
- A person can delete their own events at any time.
- The first-win funnel computes a mean time to first completion from real recorded values.

### Against the Milestone 5 verification list

| Requirement | Status |
|---|---|
| Guest-first learning | **Implemented and tested** at the database layer; the rendered journey is one of the skipped tests |
| Completion persistence | **Tested** — survives, counts once, keeps the card's length at the time |
| Saved-library isolation | **Tested** — row-level security, cross-account refusals |
| Progress calculations | **Tested** — derived from completion records only |
| Recommendation relevance | **Tested** — 7 rule tests plus the ranker's 52 |
| Empty states | **Tested** — ranker, session assembly, library, feed and first-win screens each handle nothing-to-show |
| Session boundaries | **Tested** — 6 tests |
| Accessibility | **Tested** — axe on every route, both viewports, 0 violations |
| Mobile responsiveness | **Tested** — no horizontal scroll at 360px, 44px tap targets |
| Database security | **Tested** — 238 assertions |
| No duplicate progress counting | **Tested** — completing twice counts once; impressions are never progress |

### Defects found and fixed during the milestone

| What | How found | Fix |
|---|---|---|
| The first-win component read the clock during render | Lint rule | The arrival time is set in an effect, so a re-render cannot restart the timer |
| Test blocks shared analytics rows, and read a staff-only table as a non-staff viewer | Running the new tests | The reset now clears both analytics tables; the assertions read the aggregate as staff |
| The Explore category page still carried a notice saying the feed would arrive in Milestone 4 | Reviewing after the feed landed | Removed. A test now checks that any remaining "Not built yet" notice names the milestone that delivers it |
| **A visitor with no account pressing "Start learning" would have hit an error.** The feed required a session, which contradicts browsing without registering | Reviewing the captured home page and following the link by hand | The feed is now open to anyone: a visitor gets the same ranked cards with nothing recorded about them, and an account appears only when they complete, save, like or skip. Five database assertions and two end-to-end checks hold the line |

### Still not verified

Unchanged in kind, larger in number: 36 live-service tests. `docs/VSHARES_SUPABASE_SETUP.md`
gives the exact steps to clear them, needs only the publishable key, and costs nothing.
