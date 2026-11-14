# VSHARES — Architecture

- Version: 1.2 · Date: 2026-11-14 · Stack approved by the owner (Phase 0 decisions §5; Official Development Platform Directive).
- VSHARES 2.0 is a fresh, independent engineering project built directly in this GitHub repository with Claude Code. Lovable is not used for generation, backend, hosting or deployment, and nothing in this architecture depends on it. VSHARES shares no code, configuration, credentials or infrastructure with any other project.
- Companions: `VSHARES_DATA_MODEL.md`, `VSHARES_API_CONTRACTS.md`, `VSHARES_SECURITY.md`, `VSHARES_DECISIONS.md`.

## 1. Shape

One **modular monolith**: one Next.js application, one PostgreSQL database (Supabase), one deployable. Modules are folders with enforced boundaries. Future systems get a reserved module and a documented interface — no code, tables or infrastructure until their release.

```text
 Browser (mobile-first web app)
    │  HTTPS · HTTP-only session cookie · no direct database access
    ▼
 Next.js application (Node runtime)
 ├── UI: server components + small client islands
 ├── Entry points: server actions · route handlers · proxy (session refresh, route guards)
 ├── Modules   content · feed · profiles · personalisation · progress · vai · analytics · admin
 │             (reserved: learning · creators)
 └── Platform  env · db clients · auth · authz · validation · rate limit · logger · flags · errors
    │
    ▼
 Supabase: PostgreSQL (RLS on every table) · Auth (magic link, Google, anonymous guests) · Storage (avatars)
```

## 2. Technology

| Concern | Choice | Rationale | Alternative rejected |
|---|---|---|---|
| Language | TypeScript `strict` | One typed language end to end | — |
| Framework | Next.js App Router, React | Server rendering makes the first card fast (the activation problem); server actions keep the API surface small; continuity with prior work | SPA + separate API: two deployables, slower first paint |
| Styling | Tailwind CSS 4 + CSS-variable tokens | Brand encoded once as tokens | CSS-in-JS: runtime cost |
| UI primitives | Own components; Radix primitives only for dialog, menu, tabs, toast | Accessible behaviour without a generic look | Full UI kit: off-brand. Hand-rolled: accessibility risk |
| Database | PostgreSQL | Relational domain; ranking and funnels are SQL-shaped | Document store |
| Platform | Supabase (Postgres, Auth, Storage) | Owner-approved; anonymous users that upgrade in place fit the guest journey; RLS as a second authorisation layer; full local stack for tests | Self-run Postgres + custom auth: we would own session security |
| Data access | Supabase client with generated types, **server-side only**; plain SQL migrations; SQL functions for multi-step or privileged writes | RLS applies to every user-scoped query; no ORM dependency | ORM: bypasses RLS unless carefully configured |
| Validation | Zod | Same schema validates server input and types forms and env | — |
| Tests | Vitest (unit, integration) · Playwright + axe (E2E, accessibility) · SQL tests on local Supabase (RLS) | Each layer tested where it is enforced | — |
| CI | GitHub Actions | Already added: lint, typecheck, build, audit, secret scan | — |
| Analytics | First-party events in Postgres | No third-party processor; joins to learning data | PostHog/Mixpanel: revisit at scale |
| Background work | `pg_cron` + SQL functions | Rollups and cleanup are set-based | Queue + workers: add when work is not SQL-shaped |
| AI | None in the MVP. `vai` exposes a `ModelProvider` interface with no implementation | Deterministic ranking is testable and free | LLM calls now: cost, no evaluation data |
| Hosting | Host-agnostic Node build (`next build` / `next start`, or a container); provider to be selected and approved separately | No paid change without approval; no host-specific APIs in application code | Lovable hosting: excluded by permanent decision |
| Payments | None | Owner decision | — |

Dependency policy: exact pinned versions, lockfile committed, `npm ci` everywhere, audit in CI, each new dependency justified in the decision log.

Planned runtime dependencies for the MVP beyond what exists: `zod`, `server-only`, the Radix primitives named above. Dev: `vitest`, `@playwright/test`, `@axe-core/playwright`, Supabase CLI.

## 3. Modules

```text
src/modules/<module>/
  index.ts        public API — the only file other modules may import
  service.ts      business rules, framework-free, unit-tested
  repository.ts   the only place this module touches the database
  schemas.ts      Zod schemas for inputs and outputs
  actions.ts      server actions: rate-limit → authenticate → validate → authorise → service
  components/     UI owned by the module
```

| Module | Owns | MVP responsibility | Depends on | Future interface (documented, not built) |
|---|---|---|---|---|
| `content` | Categories, topics, value cards, submissions, reports, attribution | Catalogue reads; submission; public card pages | platform | `kind`/`origin` extension for original and ingested content; `ContentVersion`; media assets |
| `profiles` | Profile, roles (read), account lifecycle | Profile CRUD; guest upgrade; export; delete | platform | Public profiles, follows |
| `personalisation` | Declared topics, learned affinities, switches | Preference memory; inspect / edit / reset | content | User DNA: `getLearnerProfile()` gains skills, pace, formats, gaps |
| `progress` | Interaction state, saves, completions, summaries | Interactions; saved library; progress summary | content | Mastery, XP ledger, applied actions, review schedule |
| `vai` | Ranking, recommendation, explanation, recommendation log | Feed ranker v1; Next Best content; "Why this?" | content, personalisation, progress | `NextBestMove` rules beyond content; `ModelProvider`; mentor; memory records |
| `feed` | Session assembly and feed UI | Candidate query; finite sessions; closing card | content, vai, progress | Mixed item types (lessons, quizzes, reviews) |
| `analytics` | Event vocabulary, ingestion, rollups, reports | Funnel events; first-session and content funnels | platform | Flow map; alignment score; value-leak rules; retention signals |
| `admin` | Admin UI, moderation workflow, audit log | Queue; catalogue and taxonomy management; roles; funnel views | all (via public APIs) | Command-centre sections for VAI, creators, retention, ops |
| `learning` *(reserved)* | Paths, lessons, quizzes, quests | — | — | `enrol()`, `gradeAttempt()`, `getNextStep()`; emits completion events consumed by `progress` |
| `creators` *(reserved)* | Creator profiles, publishing, creator analytics | — | — | `submitDraft()`, `getCreatorStats()`; reuses `content` moderation states |

Dependency rule: arrows point one way — `admin → feed → vai → {personalisation, progress} → content → platform`; `analytics` is called by any module through a single `track()` function and imports none of them. Enforced by an ESLint import-boundary rule and a test that fails on cycles.

Repository layout:

```text
src/app/        (public) home, c/[slug] · (auth) sign-in, callback · (app) path, learn, explore, saved, you · admin · api
src/modules/    as above
src/components/ui/   design-system primitives
src/platform/   env.ts db/ auth/ authz.ts action.ts rate-limit.ts logger.ts flags.ts errors.ts
src/styles/     tokens.css globals.css
supabase/       migrations/ seed/ tests/
tests/          integration/ e2e/
docs/
```

## 4. Request pipeline

Every mutation goes through one wrapper (`platform/action.ts`), so no step can be forgotten:

1. **Rate limit** — per user (per IP hash for unauthenticated calls) and per action.
2. **Authenticate** — resolve the session server-side with `auth.getUser()`; never trust a client-supplied user ID.
3. **Validate** — Zod schema; unknown fields rejected; size limits enforced.
4. **Authorise** — server role check where needed, and RLS in the database. Both must pass.
5. **Execute** — module service.
6. **Record** — analytics event if defined; audit entry for admin actions.
7. **Respond** — typed result or a uniform error. Database errors are logged, never returned.

Database clients (only in `platform/db`):

| Client | Identity | Use |
|---|---|---|
| Request client | Signed-in or guest user's JWT; RLS applies | All user-scoped work |
| Public client | Anon key, no user | Published catalogue on public pages |
| Service client | Service role, bypasses RLS | Short allow-list: account deletion, export assembly, scheduled jobs, role grants. Each use is a named function with its own authorisation check and test. Never imported outside `platform/db/service.ts` |

## 5. Authentication and session design

| Topic | Design |
|---|---|
| Provider | Supabase Auth |
| Methods | Email magic link (PKCE flow); Google OAuth; anonymous sign-in for guests |
| Sessions | Access + refresh tokens in HTTP-only, `Secure`, `SameSite=Lax` cookies via `@supabase/ssr`; refreshed in the proxy; server code always verifies with `auth.getUser()`, never reads claims from an unverified cookie |
| Guests | An anonymous user (Supabase anonymous sign-in, behind `platform/auth.upgradeGuest`/`ensureGuest`) is created on the first write a guest makes (completing or saving a card) — not on page view. Protected by rate limiting and Supabase's bot protection (CAPTCHA provider to be chosen; free tiers exist). JWT carries `is_anonymous`; RLS and server checks use it to deny guest-forbidden actions (submitting, reporting, public profile) |
| Upgrade | Registering links an email or Google identity to the same user ID. No data migration. If the email already belongs to an account, the user signs in to that account and is offered a one-time merge of guest completions and saves (server function, tested) |
| Redirects | `next` parameter accepted only as a same-site relative path (fixed in legacy code on 2026-11-14; reimplemented in `platform/auth`) |
| Route protection | Proxy redirects unauthenticated requests away from `(app)` routes that need an account and from `/admin`. This is a UX convenience; the security boundary is steps 2–4 of the pipeline plus RLS |
| Roles | `user_roles` table; read through a `has_role()` SQL function used by RLS; granted only by an admin through an audited server function. Roles are never stored in user-editable metadata. The first admin is bootstrapped by a one-off SQL statement documented in the runbook |
| Recovery | Passwordless: recovery is a new magic link. Email change requires confirming the new address |
| Sign-out | Revokes the refresh token; "sign out everywhere" available in settings |
| Deletion | Server function deletes the auth user; foreign keys cascade; audited |
| Demo mode | Removed. The public catalogue and the guest account replace it |
| Abuse limits | Magic-link requests limited per email and per IP; anonymous sign-ins limited per IP; stale anonymous users purged after 30 days |

## 6. Feed ranking specification (VAI ranker v1)

Implemented in `src/modules/vai/ranker.ts`. Deterministic: the same inputs
always produce the same order, which is what makes a recommendation
explainable, testable and comparable between configurations.

Nothing here optimises for clicks, dwell time or session length. The one
popularity signal is a completion rate, not a click rate.

### Stage 1 — candidates (SQL)

Published cards only, enforced by the query and again by row-level security.
Excluded for this viewer: completed, skipped, marked not useful, or shown
within the repeat window (48 hours) without being opened. That is why a
completed card cannot dominate the feed and a skip genuinely changes what
comes next. Scope: the chosen topic, or all topics. Limit 200.

### Stage 2 — score (pure function)

`score = Σ weightᵢ × componentᵢ − penalties`, every component in [0, 1].

| Component | Weight | What it measures |
|---|---|---|
| `declaredInterest` | 0.30 | 1 if the card's primary topic is one the person chose, 0.5 if only a secondary topic matches, else 0 |
| `learnedAffinity` | 0.20 | Affinity for the topic, learned from their own completions, saves, likes and skips. 0.2 for a topic with no history |
| `quality` | 0.20 | Editorial quality score ÷ 100 |
| `levelFit` | 0.10 | 1 at the person's level, 0.5 one step away, 0 two steps away |
| `engagementQuality` | 0.10 | Completion rate among people shown the card, smoothed towards a 0.35 prior with a weight of 20 impressions |
| `freshness` | 0.05 | `exp(−ageDays / 90)` |
| `timeFit` | 0.05 | 1 within the person's session length, falling to 0 at four times it |

Penalties, subtracted after the sum:

| Penalty | Size |
|---|---|
| Shown before and not opened | −0.05 per impression, capped at −0.15 |
| Same source as something completed in the last day | −0.05 |

Ties break on publication date, then on id, so the ordering is total and does
not depend on the order candidates arrived in.

**The smoothing matters.** A card with three impressions and three
completions does not leap to the top, and a card with none is neither
punished nor flattered: with no data the component is exactly the prior, a
stated assumption rather than an invented statistic.

**Learned affinity** starts at 0.5 for a declared topic and 0.2 otherwise,
and moves by an exponential average towards a target: complete → 1.0 at rate
0.15; save or like → 1.0 at 0.10; skip → 0.0 at 0.10; marked not useful →
0.0 at 0.20. Opening alone changes nothing. It is visible and resettable on
the YOU tab, and no client can write it directly.

### Stage 3 — session assembly

Seven cards (configurable), with no more than two consecutive from one topic
and no more than two from any one source. Position five goes to the best card
from outside the person's declared topics, marked so the interface can say
why. If the variety rules cannot all be met the session is still filled:
variety is a preference, an empty slot is not an improvement.

The session ends. There is no refill and no infinite scroll; starting another
is a deliberate act.

### Modes

| Mode | Components used |
|---|---|
| Personalised (default) | All |
| Personalisation off | `declaredInterest`, `quality`, `engagementQuality`, `freshness`. Nothing learned about the person, and no penalties |
| New account | The same formula. With no history, `learnedAffinity` sits at its floor and `engagementQuality` at the prior, so quality and the chosen topic decide |

### Evidence and explanation

Every served card is logged in `recommendations` with its component
breakdown and the configuration version in force. "Why this?" reads that row
and turns the components that actually contributed into sentences. A reason
the ranker did not use cannot appear, and if the log is missing the interface
says so rather than inventing one.

### Changing the weights

Weights and parameters live in `ranking_configs`, versioned, one active at a
time, readable by anyone and writable only by an administrator. A past
recommendation can still be explained by the weights that produced it.
Replacing the ranker with anything learned must beat version 1 on logged
outcomes first.

## 7. Analytics

- Fixed event vocabulary, validated per event: `session_started`, `topic_selected`, `card_impression`, `card_opened`, `source_clicked`, `card_completed`, `card_saved`, `card_liked`, `card_skipped`, `card_feedback`, `card_shared`, `signup_completed`, `submission_created`, `search_performed`.
- Completion, save, like, skip, submit and sign-up are recorded server-side inside the same transaction as the state change. Impressions and opens arrive by beacon to `/api/events`, batched and rate-limited.
- Dimensions: pseudonymous user ID, session ID, card, topic, category, acquisition source (referrer host and `utm_source` only), device class. No IP addresses, no free text.
- Daily rollups by event × topic / card / source / device feed the admin views; raw events kept 13 months (proposal).

## 8. Observability and operations

- Validated environment at boot (`platform/env.ts`): the app refuses to start with missing or malformed configuration. No silent fallback to demo data.
- Structured JSON logs with request ID, route, user ID hash, duration, outcome. No personal data.
- `/api/health` (process up) and `/api/ready` (database reachable, expected migration applied).
- Security headers and CSP set in `next.config.ts`; verified by test.
- Error tracking service and uptime monitoring: recommended; third-party, so each needs approval.
- Migrations: forward-only timestamped SQL via Supabase CLI; applied to local and CI databases from scratch on every run; destructive changes need owner approval and a backup.

## 9. Portability and vendor boundaries

All application logic lives in this repository and is ours. Supabase supplies infrastructure (a Postgres database, an auth service, object storage); it does not hold business rules beyond row-level policies and a small set of SQL functions that are themselves versioned here as plain SQL.

Each external dependency sits behind one boundary, so it can be replaced without touching the modules:

| External concern | Boundary in our code | What a migration would involve |
|---|---|---|
| Database | Standard PostgreSQL; forward-only SQL migrations in `supabase/migrations`; all queries inside module `repository.ts` files | Run the same migrations on any Postgres host; swap the client inside `platform/db` and the repositories. No Supabase-only extensions are required by the schema |
| Row-level security identity | Policies call our own SQL helpers `app.current_user_id()`, `app.is_guest()` and `has_role()` — never `auth.uid()` directly | Re-implement three small functions for the new auth source; policies stay unchanged |
| Authentication | `platform/auth` exposes `getSession()`, `requireUser()`, `signInWithEmail()`, `signInWithProvider()`, `signOut()`, `upgradeGuest()`; modules never import the Supabase auth client | Write a new adapter behind the same interface; migrate user identifiers (UUIDs are kept) |
| File storage | `platform/storage` with `put()`, `getUrl()`, `remove()`; the database stores paths, not vendor URLs | New adapter for any S3-compatible store; copy objects |
| Email | `platform/email` with `send(template, to, data)` | New adapter |
| Rate-limit store | `platform/rate-limit` interface over a Postgres table | Swap for Redis or similar behind the same interface |
| AI models | `vai` `ModelProvider` interface (no implementation in the MVP) | One adapter per provider; ranking and progress logic never depend on a model |
| Analytics | `analytics.track()` and our own tables | Add an exporter; data is already ours |
| Hosting | Standard Node build; configuration only through environment variables validated in `platform/env` | Deploy the same build elsewhere |
| Scheduled jobs | SQL functions invoked by a scheduler (`pg_cron` on Supabase) | Any cron that can call a SQL function or an authenticated internal endpoint |

Honest assessment of remaining coupling: Supabase Auth is the tightest dependency (session cookies, anonymous users, OAuth configuration). Replacing it is real work, contained in `platform/auth`, the three SQL helpers and a user-ID-preserving data migration — not a rebuild. Everything else is a like-for-like swap.

Rules that keep this true: no Supabase imports outside `src/platform` and `repository.ts` files (lint-enforced); no vendor URLs or vendor-specific IDs stored in tables; no host-specific runtime APIs; no secrets or configuration shared with any other project.

## 10. Scaling path (only when measurements require it)

1. Partial indexes and rollups; partition `analytics_events` by month.
2. Edge-cache public card pages.
3. Precompute candidate sets or move scoring into SQL.
4. Add a job queue for non-SQL work.
5. Extract a service only where a module has a distinct scaling or security profile.

## 11. Verified vs unverified

- Verified in this session: the legacy app builds, lints and type-checks on the upgraded, pinned dependencies.
- Not verifiable from this environment: whether a live Supabase project or Render deployment exists. No credentials or environment variables for either are present, and outbound access is restricted. The plan therefore assumes none exists and develops against a local Supabase stack; see "Decisions required" in the progress log.
