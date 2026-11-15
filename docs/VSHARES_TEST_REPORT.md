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

### Continuous integration

Run `43645447529` on commit `c3f6a46`, pull request #8: **all five jobs passed** — hygiene, lint, types, unit tests and build; database policies and functions; end-to-end and accessibility; dependency audit; full-history secret scan.

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

## 2026-11-14 — Milestone 6 (submissions, sharing, data rights and account lifecycle)

Environment: Node 22, PostgreSQL 16 with the project's test harness, preinstalled Chromium, no auth service and no outbound network.

| Check | Command | Result |
|---|---|---|
| Repository hygiene | `npm run check:hygiene` | pass — 222 tracked files |
| Lint | `npm run lint` | pass (0 warnings) |
| Types | `npm run typecheck` | pass (strict) |
| Unit tests | `npm test` | **157 passed, 0 failed** (11 files; 7 new on log and error-message privacy) |
| Database policies and functions | `npm run test:db` | **20 files, 305 assertions, 0 failed** (57 new) |
| End-to-end, accessibility, headers | `npm run test:e2e` | **82 passed, 46 skipped, 0 failed** |
| Production build | `npm run build` | pass — **20 routes** |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |

### Continuous integration

Run `43648259310` on commit `349b4ce`, pull request #8: **all five jobs passed** — hygiene, lint, types, unit tests and build; database policies and functions against a PostgreSQL service; end-to-end and accessibility; dependency audit; full-history secret scan.

### Live versus simulated — stated plainly

| Layer | Status |
|---|---|
| Export contents, erasure, retention exceptions, purge eligibility | **Real.** PostgreSQL 16, the real migrations, policies evaluated against the same request claims the API layer sets |
| Submission rules, review gating, URL validation, rate limits | **Real.** Database functions plus unit tests on the schemas |
| Rendered journeys with content (submit → see it in My Submissions → export → delete) | **Not verified.** Written as end-to-end tests and skipped for want of an auth service |
| Source links | **Not verified.** No outbound network here |

**Account erasure is verified at the database layer and not end to end.** The directive asks that full erasure not be claimed until the whole process is verified, so it is not claimed: what is proven is that `delete_my_account` empties or anonymises every column the data inventory lists, leaves no orphan, and refuses without a confirmation and a recent sign-in. The same sequence driven through a real auth service is one of the skipped tests.

### Data rights coverage (33 assertions, `190_data_rights.sql`)

- The export carries the account, profile, preferences, consent history, roles, topics, interactions, sessions, recommendations, submissions, own reports, analytics events and merge records — each checked for presence, not assumed.
- **It carries nothing belonging to anyone else**, including another account's reports on the same card.
- It omits the internal moderation trail and other people's identities.
- Deletion refuses without the typed confirmation.
- Deletion refuses when the last sign-in is older than 15 minutes, and proceeds when it is recent.
- A guest can delete without re-authenticating, having nothing to re-authenticate with.
- After deletion: every cascading table is empty, every anonymising column is null, **no orphaned identifier remains anywhere**, and the published card the person submitted is still published and still readable by a stranger.
- The audit entry exists, names no actor, and holds a digest rather than the account id.
- Another account's data is untouched by the whole operation.

### Guest lifecycle coverage (24 assertions, `200_guest_lifecycle.sql`)

- An old abandoned guest is eligible; a new one is not.
- **An old guest with a recent interaction or a recent session is kept.** Both paths tested separately.
- A converted account is out of scope whatever its age.
- The dry run changes nothing and reports the same counts the real run would act on.
- A second real run finds nothing: the job is idempotent.
- Neither `anon` nor `authenticated` may execute it.
- A real run is audited; so is one that deletes nothing.

### Submission and sharing coverage (new assertions in `130_submissions.sql`, `150_public_visibility.sql`)

- A submission lands as a draft. There is no parameter that could make it published.
- A finance or health submission is marked high-impact by category and needs a second reviewer.
- A rejected submission can be corrected once and returns to review as a new version, keeping its moderation history.
- A submitter cannot read other people's submissions, nor the moderation notes on their own.
- An unpublished slug is invisible to everyone, **including its own submitter's share link**.
- Reporting the same card twice is refused rather than recorded twice.

### Against the Milestone 6 acceptance criteria

| # | Requirement | Status |
|---|---|---|
| 1 | Submission with validation and rate limiting | **Implemented and tested** (URL protocol rules, strict schemas, pipeline rate limit) |
| 2 | No submission bypasses review or source verification | **Tested** — the function cannot produce a published row |
| 3 | My Submissions with status and correction | **Implemented**; the rendered journey is a skipped test |
| 4 | Reporting with duplicate protection | **Tested** |
| 5 | Sharing that cannot expose unpublished content | **Tested** at the database layer and end to end (404 on an unpublished slug) |
| 6 | Export containing the stated categories and nothing else | **Tested** — 33 assertions |
| 7 | Deletion with recent authentication and typed confirmation | **Tested** at the database layer; **not** verified end to end through a real sign-in |
| 8 | Guest lifecycle policy, implemented, not scheduled | **Implemented, tested, documented, deliberately not scheduled** |
| 9 | No sensitive data in logs or error messages | **Tested** — 7 new unit tests drive the pipeline with an email address, a note and a token, on success, validation failure, handler failure and an exception, and assert that none of those values appears in any line written or in the envelope returned. The caller is recorded as a digest, never as an account id. The readiness endpoint leaks no configuration |
| 10 | Documentation and evidence updated | This report, the data inventory, the guest lifecycle policy, the decision log, the register and the progress log |

### Defects found and fixed during the milestone

| What | How found | Fix |
|---|---|---|
| **`account_merges.guest_user_id` held a user identifier with no foreign key.** Deleting that guest would have left a personal identifier behind for ever | Doing the data inventory against the live schema instead of reading the data model document | A nullable foreign key that nulls on deletion, plus an assertion that no orphan remains |
| Account deletion failed with a foreign-key violation: the audit row referenced the account being deleted | Running the new deletion test | The audit entry is written first, with no actor and a digest instead of the id |
| The append-only guard refused the cascade through `account_merges` | Running the new deletion test | `app.append_only_except_actor` extended to that table, which permits exactly one change: the named actor column moving to null |
| Two versions of `purge_stale_guests` existed, so a call was ambiguous | Running the new purge test | The single-argument version dropped; the remaining one defaults to a dry run |
| A component called `setState` synchronously inside an effect | Lint rule | Restructured with a cancellation flag and an attempt counter |
| Nothing was testing the "no sensitive data in logs" rule; it held by construction only | Writing this report and declining to call it tested | `tests/unit/log-privacy.test.ts`, which fails if a future change (or a dependency's error wording) starts echoing input |

### Still not verified

**46 live-service tests** remain skipped, up from 36: the ten new ones cover the submission, export, deletion and share journeys through a real sign-in. `docs/VSHARES_SUPABASE_SETUP.md` gives the exact steps; it needs only the publishable key and costs nothing.

Also outstanding and unchanged: source links cannot be checked here, so no card can be published; and the owner's editorial review of batch 1 is pending.

## 2026-11-14 — Milestone 7 (essential analytics and product intelligence)

Environment: Node 22, PostgreSQL 16 with the project's test harness, preinstalled Chromium, no auth service and no outbound network.

| Check | Command | Result |
|---|---|---|
| Repository hygiene | `npm run check:hygiene` | pass |
| Lint | `npm run lint` | pass (0 warnings) |
| Types | `npm run typecheck` | pass (strict) |
| Unit tests | `npm test` | **177 passed, 0 failed** (12 files; 20 new) |
| Database policies and functions | `npm run test:db` | **22 files, 381 assertions, 0 failed** (76 new) |
| End-to-end, accessibility, headers | `npm run test:e2e` | **90 passed, 62 skipped, 0 failed** |
| Production build | `npm run build` | pass — **21 routes** |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |

### Continuous integration

Run `43652248887` on commit `56cf176` and run `43652389183` on commit `cf9bfd7`, pull request #8: **all five jobs passed on both** — hygiene, lint, types, unit tests and build; database policies and functions against a PostgreSQL service; end-to-end and accessibility; dependency audit; full-history secret scan.

### Query performance — measured, not assumed

`scripts/measure-analytics-performance.mjs`, against 2,000 cards, 2,000 accounts, 80,000 interactions and 4,809 sessions spread over 60 days:

| Query | Median |
|---|---|
| **Rollup, one day (what a nightly job runs)** | **93.6 ms** |
| Rollup, all 61 days in one statement | 4,014 ms |
| Reconcile one day | 58.7 ms |
| Dashboard: overview, 30 days | 34.2 ms |
| Dashboard: topic breakdown, 30 days | 31.0 ms |
| Dashboard: moderation trends | 33.1 ms |
| Dashboard: median time to first win | 29.8 ms |

Each dashboard figure includes about 30 ms of `psql` start-up, so they are upper bounds.

**No learner-facing query reads any analytics table.** The feed, a card page and the progress screen touch `content_items`, `content_interactions` and `recommendations` only. The rollup runs out of band and the dashboard reads what it wrote.

#### A 6.6× regression, found by measuring

The first working version took **702 ms** for one day. The cause was not a missing index: `app.day_of()` carried `set search_path = ''`, and **a SQL function with a SET clause cannot be inlined**, so it was evaluated per row and the index could not be used.

Measured directly on 80,000 rows: `app.day_of(completed_at) = ...` took **95.5 ms**, the identical inline expression **6.4 ms**. Removing the SET clause — safe only because the body names no objects — took a day's rollup from **702 ms to 106 ms**.

#### Three indexes written, measured, and removed

Three indexes were added for the rollup, then measured: **73–77 ms with them, 72–77 ms without**. They changed nothing, because `content_interactions_completed_idx` already covers the only scan large enough to matter and `feed_sessions` is small. They were removed. The directive asks for indexes only where measurement justifies them, and this measurement did not.

### Reconciliation — results

`reconcile_day()` counts the product tables afresh and compares, per metric.

| Case | Result |
|---|---|
| After a rollup | **0 mismatches** across all ten reconciled metrics |
| Before any rollup | Reports `rolled_up: false` and mismatches, rather than agreeing with an empty day |
| A stored count tampered with by hand | **1 mismatch**, reported and not corrected |
| After recomputing | Back to 0 |
| After an account deletion | Mismatches reported, **all in one direction** (stored higher than a fresh count), with `erasures_since_rollup` from the audit log naming the cause |

### Accessibility of the new components

`npm run check:gallery-a11y` runs axe over the component gallery, where the chart marks are rendered, at 412px and 1280px: **0 violations** at both.

It is a separate script rather than part of the end-to-end suite on purpose. The gallery is not served in production, and `security-headers.spec.ts` asserts it answers 404 there; adding it to the routine accessibility list meant turning dev tools on for the whole run, which made that security check pass for the wrong reason. Caught by running the suite and watching that test fail, then reverted.

### Database coverage added (76 assertions)

`210_analytics_rollup.sql` (34) and `220_analytics_integrity.sql` (42):

- **Replay cannot move a derived number.** A completion recorded three times and announced to the event endpoint twenty times still counts as one; the reported count faithfully records twenty, in a separate row that is never merged with it.
- **Re-running the rollup three times gives the same answer**, and records the day once.
- **The reporting day is UTC.** A completion at 23:30 UTC and one at 00:30 UTC land on different days when read from a session set to `Pacific/Auckland`.
- **A session crossing midnight is split**: started on one day, completed on the next, and neither day is told it had a whole session. An abandoned session is never counted as completed.
- **A day that was never computed is absent**; a computed day with nothing in it is a genuine zero and carries the time it was computed. A mean with nothing to average is null, never zero.
- **A future day is refused.**
- **Groups below five are withheld** and marked suppressed rather than vanishing.
- **Access**: a learner cannot compute, reconcile, or read any aggregate. Staff can read aggregates but cannot compute one, and still cannot read one person's events or one person's first-win timing.
- **The first-win timer** is refused from someone who has completed nothing, accepted once, ignored on every later call, range-checked, carried in the export, and removed on deletion.
- **Conversion** is dated where it happens and cannot be double counted.
- **Withdrawing consent** clears identified events and stops further ones, while the identifier-free aggregate keeps every count.

### Defects found and fixed during the milestone

| What | How found | Fix |
|---|---|---|
| **The first-win timing and the conversion date were written to `profiles`, which has a policy making a public profile readable by anyone and another letting any moderator read every row.** Row-level security has no column granularity, so both would have been readable by the world and by staff | Writing a test that asserted staff could not read an individual timing — and watching it fail | A separate `learner_milestones` table whose only policy is "the person reading it owns it". Six assertions hold the line |
| A day's rollup took 702 ms | Measuring before writing the performance section | `app.day_of()` could not be inlined while it carried a SET clause. 6.6× faster without it |
| Three indexes that did nothing | Measuring with and without them | Removed |
| The test harness did not clear the new tables between cases | Running the new tests | `test.reset()` now truncates `analytics_rollups` and `learner_milestones` |
| `rollup_day` was revoked from everyone including the service role | Running the first rollup test | Granted to `service_role` only, which is the intended caller |
| The applied-learning tile read "Not enough data", which invites the reader to wait for a number that is never coming | Looking at the captured screenshot | A separate `emptyLabel`, so "Not measured" and "Not enough data" are different statements |
| Adding the gallery to the accessibility suite required dev tools on, which made the "gallery is not reachable in production" security check pass for the wrong reason | Running the suite | Reverted; the gallery is checked by its own script instead |
| **The Milestone 5 funnel view mixed a browser's claim with a measurement.** `first_completion_seconds` now exists as both a reported event and a derived metric; the view's `max(...) filter (where name = ...)` took whichever row was larger. A browser claiming 9,999 seconds beat a measured 60 | Reading the two definitions side by side after adding the derived metric, then proving it with a query | The superseded view is pinned to reported rows, which is all it ever counted. Three assertions now hold the two apart |

### Against the Milestone 7 requirements

| Requirement | Status |
|---|---|
| Essential metrics (first win, time to first win, sessions, cards, saves, topics, repeat activity, submissions, reports, conversion) | **Implemented and tested.** Journeys across PATH / LEARN / EXPLORE are covered only as surfaces on reported events; the derived metrics are not yet split by surface |
| Every metric defined precisely | **Done** — `VSHARES_METRICS_DICTIONARY.md`, generated into the dashboard from one source |
| Observed behaviour distinguished from inferred learning | **Done** — every completion metric prints "not a measure of understanding, never evidence of mastery" |
| Value framework with four separate tiers | **Done** — `VSHARES_VALUE_FRAMEWORK.md`. Application and outcome are empty and say so |
| No speculative improvement scores | **Done**, and a unit test fails if the words appear |
| Admin dashboard | **Implemented** at `/admin/metrics`; the rendered page with data is a skipped live check |
| No identifiable learning history in aggregates | **Tested** — staff cannot read individual events or timings at all |
| Small-group suppression | **Tested** — threshold of five, enforced in the database |
| Consent preserved | **Tested** — identifier-free before consent, identified only after, cleared on withdrawal, gone on deletion |
| No shadow tracking identities | **Tested** — four end-to-end checks find no tracking cookie, no tracking key in browser storage, and no third-party request on any route |
| Event deduplication, completion counting, session boundaries, aggregate accuracy, consent withdrawal, deletion effects, rollup reconciliation, time zones, missing data, staff isolation, replay protection | **All tested.** See the coverage list above |
| Performance measured on a representative dataset | **Done**, with a regression found and fixed |
| Indexes only where justified | **Done** — three added, measured, removed |
| Guest purge dry run approved, destructive purge not | **Documented, not scheduled** — `VSHARES_SCHEDULED_JOBS.md` |
| Consolidated live-verification checklist | **Done** — `VSHARES_LIVE_VERIFICATION.md`, 62 checks |
| Admin catalogue interface recorded as outstanding | **Done** — marked a release blocker in the register, not claimed as implemented |

### Still not verified

**62 live-service checks**, up from 46: the sixteen new ones cover the dashboard, the suppression behaviour and the first-win timer through a real sign-in. Three of them also need a privileged client. `VSHARES_LIVE_VERIFICATION.md` lists every one and the order to clear them in.

Also unchanged: no source link has been checked, so no card can be published; and the owner's editorial review of batch 1 is pending.

## 2026-11-15 — Milestone 8 (release hardening and MVP verification)

Environment: Node 22, PostgreSQL 16 with the project's test harness, preinstalled Chromium, **no auth service and no outbound network**. The single most important fact about this milestone: **live integration is blocked** and is reported as blocked, never simulated. `VSHARES_RELEASE_DASHBOARD.md` is the single view.

| Check | Command | Result |
|---|---|---|
| Repository hygiene, lint, types | — | pass |
| Unit tests | `npm test` | **192 passed, 0 failed** (13 files; 15 new admin-schema tests) |
| Database policies and functions | `npm run test:db` | **23 files, 395 assertions, 0 failed** (14 new in `230_admin_access.sql`) |
| End-to-end, accessibility, headers | `npm run test:e2e` | **90 passed, 72 skipped, 0 failed** (admin 404-guard runs; 10 admin-live journeys skipped) |
| Accessibility of charts + admin components | `npm run check:gallery-a11y` | **0 violations**, both viewports |
| Backup and restore drill | `npm run drill:backup` | **9/9 checks passed (executed)** |
| Production build | `npm run build` | pass — **25 routes** |
| Audit, production dependencies | `npm audit --omit=dev` | 0 vulnerabilities |

### Continuous integration

Run `43677143520` on commit `df85599`, pull request #8: **all five jobs passed** — hygiene, lint, types, unit tests and build; database policies and functions against a PostgreSQL service; end-to-end and accessibility; dependency audit; full-history secret scan.

### What was built: the admin catalogue and taxonomy interface

The one feature release-blocker from Milestone 3 is now built and tested:

- `/admin/taxonomy` — create, edit, archive and restore categories and topics (admin-only).
- `/admin/cards/new` — create a curated card; it enters as a draft and the form cannot shortcut the link check or review.
- `/admin/cards/[id]` — the full card: current version, whole version history, review (approve/reject/archive/restore), link-check status (read-only), and the moderation trail.
- `/admin/audit` — the audit log, admin-only.

Guarded in three layers (D-086): the layout 404s a non-staff account, the pipeline re-checks access, and the database function re-checks the role while RLS re-filters reads. `230_admin_access.sql` proves a moderator cannot manage taxonomy and a learner cannot do anything, by calling the functions as the wrong role and watching them refuse.

### Backup and restore — executed, not described

`scripts/backup-restore-drill.mjs` against real PostgreSQL 16: build and populate through the real functions, `pg_dump -Fc`, drop, `pg_restore`, verify.

| Check | Result |
|---|---|
| Backup file produced | pass (187 KB) |
| User and card rows match | pass |
| Content checksum matches | pass (md5 identical) |
| Published card resolves its version | pass |
| RLS still enabled | pass |
| Security-definer functions execute | pass |
| 33 RLS policies restored | pass |
| A later migration applies on the restore | pass |

9 of 9. Full writeup and recovery runbook in `VSHARES_BACKUP_RESTORE.md`.

### Security review — 3 findings, all low/info, all fixed

From `VSHARES_SECURITY_REVIEW.md`, covering all 14 §8 items. No critical or high findings.

- **SR-M8-01** (info): removed a misleading unused `submittedByMe` authorship field before it could become a trusted-but-false control.
- **SR-M8-02** (low): added a 300/hour rate limit to `createCard` and `addCardVersion` — the one unrate-limited mutation path.
- **SR-M8-03** (info): confirmed the admin card id is validated and parameterised, no injection path.

### Performance — measured, with a real finding

`VSHARES_PERFORMANCE_ACCESSIBILITY.md`. First-load JavaScript **~224 KB** (budget ≤ 300 KB). Shell routes render in ~100–170 ms. `/explore` measured ~7,100 ms to first paint **in this environment only** — the cause is the placeholder, unreachable database host timing out, because Explore blocks its first render on a category read; against a healthy DB the same query is sub-millisecond. Reported honestly rather than hidden or averaged away.

### Defects found and fixed during the milestone

| What | How found | Fix |
|---|---|---|
| A misleading unused authorship field on the admin card read | The security review | Removed; the real high-impact rule is in the database |
| Two card-write actions had no rate limit | The security review | Added `staffWritePerUser` (300/hour) |
| The backup drill's function check named a function from the held-back migration | Running the drill | Pointed it at a baseline function — the "absence" was correct, the test was wrong |
| The backup seed hit the published-card constraint with raw inserts | Running the drill | Seeded through the real `create_card` → `record_link_check` → `moderate_content` path instead, which is more representative anyway |

### Against the Milestone 8 directive

| # | Requirement | Status |
|---|---|---|
| 2 | Live Supabase environment | **Blocked** — no project/service available here; reported, not simulated |
| 3 | Clear the 62 skipped live tests | **Blocked** — and the count rose to 72 because M8 *added* admin journeys; none removed or weakened |
| 4 | Admin catalogue and taxonomy interface | **Done and tested** |
| 5 | Content verification / launch catalogue | **Blocked (link check)** / **Open (editorial)** |
| 6 | End-to-end erasure across account types | **Blocked** — DB layer proven, live unverified; not claimed |
| 7 | Backup and recovery drill | **Done — executed, 9/9** |
| 8 | Security review | **Done — 14 items, 3 low/info findings fixed** |
| 9 | Performance and accessibility | **Measured where possible; Core Web Vitals and screen-reader pass blocked** |
| 10 | First Learning Win 60-second validation | **Blocked** — never measured on a real journey; target unverified |
| 11 | Guest lifecycle | **Unchanged** — dry run config documented, destructive purge disabled |
| 12 | Release dashboard | **Done** — `VSHARES_RELEASE_DASHBOARD.md` |

### Still not verified — the headline

**Milestone 8 is incomplete, and the MVP is not production-ready.** 72 live-service checks remain blocked on a service that does not exist here; full erasure and the first-win benchmark are unverified end to end; no card can be published until its links are checked. The one owner action that unblocks most of it is a free development project (D17). Everything that *can* be verified without a live service passes.

## 2026-11-15 — Live Integration stage: connection readiness

No hosted Supabase project or container runtime is available in this
environment, so the 72 live-service journeys remain **blocked** — and are
reported as blocked, not simulated. What *could* be verified was: that the
application applies and runs against a **Supabase-shaped** database.

A fresh PostgreSQL database was given only what a real Supabase project
provides — a real `auth.users` table, the `anon`/`authenticated`/`service_role`
roles, pgcrypto — and **no test harness**. Against it:

| Check | Result |
|---|---|
| All 7 migrations apply standalone, via `npm run apply:project` | **pass** |
| Both seed files apply | **pass** — 8 categories, 40 topics, 10 cards |
| Seeded cards load as drafts, none publishable | **pass** — 10 draft, 0 published |
| Signup trigger (`on_auth_user_created`) fires on a real-shaped `auth.users` | **pass** — insert → profile + preferences created |
| Table grants to `authenticated`/`anon` come from the migrations themselves | **pass** — 47 grants, not the test-only file |
| RLS read as `authenticated` with request claims | **pass** |
| `apply:project` refuses a local test database | **pass** |
| `bootstrap:staff` grants by email, idempotent, aborts on an unknown email | **pass** — three paths |

Two script bugs were found and fixed by running them (not by review):

- `bootstrap-staff.mjs` used psql `:'var'` interpolation, which does not work
  with `-c` or inside a dollar-quoted block. Rewritten to validate the email to
  a quote-free shape and embed it as a literal, with `ON_ERROR_STOP` so an
  unknown email aborts with a non-zero exit.
- Its first form also exited 0 on an unknown email; it now exits 1.

**This proves the application is ready to connect.** What stays blocked is the
HTTP auth and data service layer, which `@supabase/supabase-js` requires and
which needs a hosted project or a container runtime. The turnkey setup is in
`VSHARES_SUPABASE_SETUP.md`; `VSHARES_RELEASE_DASHBOARD.md` §1a tracks it.

**CI:** run `43679313262` on commit `67c11a9`, all five jobs passed.
