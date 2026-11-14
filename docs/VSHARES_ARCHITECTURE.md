# VSHARES — Architecture

- Version: 1.1 · Date: 2026-11-14 · Stack approved by the owner (Phase 0 decisions §5; Official Development Platform Directive).
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

Deterministic and transparent: the same inputs always give the same order.

### Stage 1 — candidate query (SQL)

Published cards, excluding for this user: completed; skipped; marked not useful; shown in the last `repeat_window_hours` (default 48) without being opened. Scope: the user's topics (declared or learned), or one chosen topic. Limit 200, newest first. If fewer than one session's worth remain, widen to sibling topics in the same category, then to all topics; the closing card says so honestly.

### Stage 2 — score (pure function, `modules/vai/service.ts`)

`score = Σ weight_i × component_i`, every component in [0, 1].

| Component | Definition | Default weight |
|---|---|---|
| `declared_interest` | 1 if the card's primary topic is a declared topic; 0.5 if only a secondary topic matches; else 0 | 0.30 |
| `learned_affinity` | The user's affinity for the card's primary topic (see below) | 0.20 |
| `quality` | Editorial quality score / 100 | 0.20 |
| `level_fit` | 1 if card level equals the user's level for the topic; 0.5 if one step away; 0 if two. Level starts at beginner and steps up after 5 completions at the current level in that topic; the user can override it | 0.10 |
| `freshness` | `exp(−age_days / 90)` from publish date | 0.05 |
| `time_fit` | 1 if estimated minutes ≤ the user's preferred session length (default 10), decaying linearly to 0 at 4× | 0.05 |
| `engagement_quality` | Platform-wide completion rate of the card, Bayesian-smoothed toward the global mean with a prior of 20 impressions — so new cards are neither punished nor boosted | 0.10 |

Penalties (subtracted after the sum): previously shown and not opened: −0.05 per impression, capped at −0.15; same source as a card completed in the last 24 h: −0.05.

Ties are broken by `published_at` descending, then `id` — fully deterministic.

**Learned affinity** per user and topic: starts at 0.5 for declared topics, 0.2 otherwise. Updated by interaction with an exponential moving average toward a target: complete → 1.0 (α 0.15), save or like → 1.0 (α 0.10), skip → 0.0 (α 0.10), not useful → 0.0 (α 0.20). Opening alone changes nothing. Stored in `user_topics.affinity`; visible and resettable in YOU.

### Stage 3 — session assembly

Take the ordered list and build a session of `session_size` (default 7): no more than 2 consecutive cards from the same topic and no more than 2 from the same source per session; one "discovery" slot (position 5) is given to the best-scoring card from a topic adjacent to the user's interests, labelled as such. The session ends with a closing card: progress made in this session and the Next Best option — never an automatic refill.

### Modes

| Mode | Components used |
|---|---|
| Personalised (default for accounts) | All |
| Guest, first session | `quality`, `engagement_quality`, `freshness`, within the chosen topic; beginner level preferred |
| Personalisation off | `quality`, `freshness`, explicitly chosen topics only |

### Explanation and logging

Each served card stores its component breakdown in `recommendations`. "Why this?" renders the top two contributing components as sentences ("You chose Personal Finance", "Rated highly by our curators"). Weights and thresholds live in `ranking_configs` (versioned, one active, change audited); the active version is recorded with each recommendation so results can be compared between versions.

### Next Best (PATH tab)

One recommendation, chosen by ordered rules over the same data: (1) a card opened but not completed in the last 7 days → "Finish …"; (2) a saved card not yet opened → "You saved this …"; (3) otherwise the top-scoring candidate → "Next for you …"; (4) no topics chosen → "Pick a topic". The reason shown is the rule that fired.

### Evolution

Replacing or augmenting the ranker (learned weights, embeddings, LLM re-ranking) requires showing an improvement on logged outcomes against v1. Until then v1 stays.

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
